import {
    AllStreamsFailedError,
    CancelledError,
    FINAL_PASS_TIMEOUT_MS,
    FIRST_PASS_TIMEOUT_MS,
    RETRY_BACKOFF_MS,
    TOTAL_BUDGET_MS,
    buildAttemptPlan,
    connectWithFailover,
    hostOf,
    streamCandidates,
} from '@/services/streamResolver';

const BACKUP = 'https://backup.qurango.net/radio/mix';
const PRIMARY = 'https://qurango.net/radio/mix';
const OTHER = 'https://stream.radiojar.com/0tpy1h0kxtzuv';

describe('streamCandidates', () => {
    it('puts the healthy primary host ahead of the failing backup mirror', () => {
        expect(streamCandidates(BACKUP)).toEqual([PRIMARY, BACKUP]);
    });

    it('is stable when a station is already authored against the primary', () => {
        expect(streamCandidates(PRIMARY)).toEqual([PRIMARY, BACKUP]);
    });

    it('leaves non-qurango stations untouched — they have no mirror', () => {
        expect(streamCandidates(OTHER)).toEqual([OTHER]);
    });

    it('honours a proven backup host for networks that can only reach it', () => {
        expect(streamCandidates(BACKUP, 'backup.qurango.net')).toEqual([BACKUP, PRIMARY]);
    });

    it('ignores a preferred host that is not one of this station mirrors', () => {
        expect(streamCandidates(OTHER, 'backup.qurango.net')).toEqual([OTHER]);
    });

    it('does not corrupt the path when rewriting hosts', () => {
        expect(streamCandidates('https://backup.qurango.net/radio/athkar_sabah')[0])
            .toBe('https://qurango.net/radio/athkar_sabah');
    });
});

describe('buildAttemptPlan', () => {
    it('tries both mirrors fast, then retries the healthy host after a backoff', () => {
        expect(buildAttemptPlan(BACKUP)).toEqual([
            { uri: PRIMARY, timeoutMs: FIRST_PASS_TIMEOUT_MS, delayBeforeMs: 0 },
            { uri: BACKUP, timeoutMs: FIRST_PASS_TIMEOUT_MS, delayBeforeMs: 0 },
            { uri: PRIMARY, timeoutMs: FINAL_PASS_TIMEOUT_MS, delayBeforeMs: RETRY_BACKOFF_MS },
        ]);
    });

    it('still retries a single-host station once', () => {
        const plan = buildAttemptPlan(OTHER);
        expect(plan.map((a) => a.uri)).toEqual([OTHER, OTHER]);
        expect(plan[1].delayBeforeMs).toBe(RETRY_BACKOFF_MS);
    });

    it('keeps the worst case inside the total budget', () => {
        const worst = buildAttemptPlan(BACKUP)
            .reduce((sum, a) => sum + a.timeoutMs + a.delayBeforeMs, 0);
        expect(worst).toBeLessThanOrEqual(TOTAL_BUDGET_MS);
    });
});

describe('hostOf', () => {
    it('extracts the host', () => {
        expect(hostOf(PRIMARY)).toBe('qurango.net');
        expect(hostOf(BACKUP)).toBe('backup.qurango.net');
    });
});

/** Deterministic clock — sleeps and connect timeouts advance it, nothing waits. */
function makeDeps(overrides: any = {}) {
    let clock = 0;
    const attempts: { uri: string; timeoutMs: number; at: number }[] = [];
    const succeeded: string[] = [];
    return {
        attempts,
        succeeded,
        tick: () => clock,
        deps: {
            connect: jest.fn(async (uri: string, timeoutMs: number) => {
                attempts.push({ uri, timeoutMs, at: clock });
                const behaviour = overrides.behaviour?.(uri, attempts.length);
                if (behaviour === 'ok') return { uri };
                // A failing host burns its whole timeout before giving up.
                clock += timeoutMs;
                throw new Error('stream-connect-timeout');
            }),
            sleep: jest.fn(async (ms: number) => { clock += ms; }),
            now: () => clock,
            onHostSucceeded: (h: string) => succeeded.push(h),
            ...overrides.deps,
        },
    };
}

describe('connectWithFailover', () => {
    it('uses the primary host on the happy path and never touches the backup', async () => {
        const h = makeDeps({ behaviour: () => 'ok' });
        const sound = await connectWithFailover(BACKUP, h.deps);
        expect(sound).toEqual({ uri: PRIMARY });
        expect(h.attempts).toHaveLength(1);
        expect(h.succeeded).toEqual(['qurango.net']);
    });

    it('fails over to the backup when the primary stalls', async () => {
        const h = makeDeps({ behaviour: (uri: string) => (uri === BACKUP ? 'ok' : 'fail') });
        const sound = await connectWithFailover(BACKUP, h.deps);
        expect(sound).toEqual({ uri: BACKUP });
        expect(h.attempts.map((a) => a.uri)).toEqual([PRIMARY, BACKUP]);
    });

    it('remembers the host that worked so it can be tried first next time', async () => {
        const h = makeDeps({ behaviour: (uri: string) => (uri === BACKUP ? 'ok' : 'fail') });
        await connectWithFailover(BACKUP, h.deps);
        expect(h.succeeded).toEqual(['backup.qurango.net']);
    });

    it('bounds the first pass tightly and only gets patient on the retry', async () => {
        const h = makeDeps({ behaviour: (_u: string, n: number) => (n === 3 ? 'ok' : 'fail') });
        await connectWithFailover(BACKUP, h.deps);
        expect(h.attempts.map((a) => a.timeoutMs)).toEqual([
            FIRST_PASS_TIMEOUT_MS,
            FIRST_PASS_TIMEOUT_MS,
            FINAL_PASS_TIMEOUT_MS,
        ]);
    });

    it('backs off before retrying rather than hammering the host', async () => {
        const h = makeDeps({ behaviour: (_u: string, n: number) => (n === 3 ? 'ok' : 'fail') });
        await connectWithFailover(BACKUP, h.deps);
        expect(h.deps.sleep).toHaveBeenCalledWith(RETRY_BACKOFF_MS);
        // The retry starts after both timeouts plus the backoff, not before.
        expect(h.attempts[2].at).toBe(FIRST_PASS_TIMEOUT_MS * 2 + RETRY_BACKOFF_MS);
    });

    it('reports failure instead of hanging when every host is down', async () => {
        const h = makeDeps({ behaviour: () => 'fail' });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toBeInstanceOf(AllStreamsFailedError);
        expect(h.attempts.map((a) => a.uri)).toEqual([PRIMARY, BACKUP, PRIMARY]);
    });

    it('gives up inside the total budget', async () => {
        const h = makeDeps({ behaviour: () => 'fail' });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toThrow();
        expect(h.tick()).toBeLessThanOrEqual(TOTAL_BUDGET_MS);
    });

    it('never starts an attempt it cannot give a fair shot at', async () => {
        // A slow first attempt eats most of the budget; later attempts must be
        // trimmed to what is left rather than overrunning it.
        const h = makeDeps({ behaviour: () => 'fail' });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toThrow();
        for (const a of h.attempts) {
            expect(a.at + a.timeoutMs).toBeLessThanOrEqual(TOTAL_BUDGET_MS);
        }
    });

    it('aborts quietly when a newer tap supersedes it', async () => {
        const h = makeDeps({ behaviour: () => 'fail', deps: { isCancelled: () => true } });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toBeInstanceOf(CancelledError);
        expect(h.deps.connect).not.toHaveBeenCalled();
    });

    it('stops mid-plan once superseded, so two stations never overlap', async () => {
        let cancelled = false;
        const h = makeDeps({
            behaviour: () => { cancelled = true; return 'fail'; },
            deps: { isCancelled: () => cancelled },
        });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toBeInstanceOf(CancelledError);
        expect(h.attempts).toHaveLength(1);
    });

    it('surfaces every failed attempt for logging', async () => {
        const onAttemptFailed = jest.fn();
        const h = makeDeps({ behaviour: () => 'fail', deps: { onAttemptFailed } });
        await expect(connectWithFailover(BACKUP, h.deps)).rejects.toThrow();
        expect(onAttemptFailed).toHaveBeenCalledTimes(3);
    });
});
