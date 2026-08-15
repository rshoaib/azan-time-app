/**
 * Radio stream connection strategy.
 *
 * WHY THIS EXISTS
 * ---------------
 * The radio stations are authored against qurango's `backup.` mirror. Measured
 * 2026-08-15, 30 samples per host across 10 stations:
 *
 *   qurango.net         30/30 connected (100%)   TTFB p50 0.56s  p90 0.58s
 *   backup.qurango.net  19/30 connected (63%)    TTFB p50 0.42s  p90 0.44s
 *                       — 11 hard HTTP 500s
 *
 * That matches the Firebase alert (backup success rate < 90%, p90 response
 * > 5s across 702 samples). The mirror is fast when it answers and simply
 * fails when it doesn't, so the fix is ordering + fast failover, not patience.
 *
 * NOTE ON BUNDLING: the *adhan* audio has no network dependency at all — every
 * reciter is a bundled `require()` (see constants/reciters.ts), so prayer
 * notifications are unaffected by any of this. Only the Quran radio tab streams,
 * and a live radio station is by definition unbundleable. The nearest useful
 * equivalent to caching is remembering which host last worked for this user
 * (some networks can only reach one of the two) — see `preferredHost` below.
 *
 * STRATEGY
 *   1. Try the healthy primary host first, backup second.
 *   2. Bound every attempt so a stalled host fails over instead of hanging.
 *      First pass is short (p90 TTFB is under a second); the final pass is
 *      longer so genuinely slow mobile networks still connect.
 *   3. Retry the primary once after a short backoff before giving up.
 *   4. Stop issuing attempts once the total budget is spent, so the worst case
 *      is bounded rather than the sum of every timeout.
 */

const PRIMARY_HOST = 'qurango.net';
const BACKUP_HOST = 'backup.qurango.net';

/**
 * First-pass per-attempt cap. Measured p90 time-to-first-byte is ~0.6s, so 3s
 * is a 5x allowance for slow mobile networks while still failing over quickly.
 * Kept low enough that the whole plan fits inside TOTAL_BUDGET_MS — otherwise
 * the budget clamp would silently shorten the final retry.
 */
export const FIRST_PASS_TIMEOUT_MS = 3000;
/** Final-pass cap — generous, for slow mobile networks. */
export const FINAL_PASS_TIMEOUT_MS = 6000;
/** Pause before the retry pass, so we don't hammer a host that just failed. */
export const RETRY_BACKOFF_MS = 400;
/** Hard ceiling on the whole connect sequence. */
export const TOTAL_BUDGET_MS = 13000;

export interface Attempt {
    uri: string;
    timeoutMs: number;
    /** Backoff to wait before starting this attempt. */
    delayBeforeMs: number;
}

/**
 * Ordered stream URLs to try for a station, healthiest host first.
 *
 * `preferred` is the host that last connected successfully on this device. Some
 * networks can reach only one of the two mirrors, so a proven host outranks the
 * fleet-wide default — but only for stations that actually have both.
 */
export function streamCandidates(url: string, preferred?: string | null): string[] {
    const isQurango = url.includes(BACKUP_HOST) || url.includes(`//${PRIMARY_HOST}`);
    if (!isQurango) return [url];

    const primary = url.replace(BACKUP_HOST, PRIMARY_HOST);
    const backup = primary.replace(`//${PRIMARY_HOST}`, `//${BACKUP_HOST}`);

    return preferred === BACKUP_HOST ? [backup, primary] : [primary, backup];
}

/**
 * Full attempt plan: one bounded pass over every candidate, then a backed-off
 * retry of the first (healthiest) candidate only. Retrying the whole list twice
 * buys little when the second host fails ~37% of the time — the retry exists to
 * survive a transient blip on the good host, not to be more patient with a bad
 * one.
 */
export function buildAttemptPlan(url: string, preferred?: string | null): Attempt[] {
    const candidates = streamCandidates(url, preferred);
    const plan: Attempt[] = candidates.map((uri) => ({
        uri,
        timeoutMs: FIRST_PASS_TIMEOUT_MS,
        delayBeforeMs: 0,
    }));
    plan.push({
        uri: candidates[0],
        timeoutMs: FINAL_PASS_TIMEOUT_MS,
        delayBeforeMs: RETRY_BACKOFF_MS,
    });
    return plan;
}

export function hostOf(uri: string): string {
    const m = /^https?:\/\/([^/]+)/.exec(uri);
    return m ? m[1] : '';
}

export interface ConnectDeps {
    /** Resolve with the loaded sound, or reject/throw on failure or timeout. */
    connect: (uri: string, timeoutMs: number) => Promise<any>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    /** Called with the host that worked, so it can be preferred next time. */
    onHostSucceeded?: (host: string) => void;
    /** True if a newer request has superseded this one — abort quietly. */
    isCancelled?: () => boolean;
    onAttemptFailed?: (uri: string, err: unknown) => void;
}

export class AllStreamsFailedError extends Error {
    constructor(public readonly attempted: string[]) {
        super('all-stream-candidates-failed');
        this.name = 'AllStreamsFailedError';
    }
}

/** Sentinel thrown when a newer play request supersedes this one. */
export class CancelledError extends Error {
    constructor() {
        super('stream-connect-cancelled');
        this.name = 'CancelledError';
    }
}

/**
 * Walk the attempt plan until one connects. Throws AllStreamsFailedError if
 * every attempt fails or the budget runs out, CancelledError if superseded.
 */
export async function connectWithFailover(
    url: string,
    deps: ConnectDeps,
    preferred?: string | null,
): Promise<any> {
    const plan = buildAttemptPlan(url, preferred);
    const started = deps.now();
    const attempted: string[] = [];

    for (const attempt of plan) {
        if (deps.isCancelled?.()) throw new CancelledError();

        if (attempt.delayBeforeMs > 0) {
            await deps.sleep(attempt.delayBeforeMs);
            if (deps.isCancelled?.()) throw new CancelledError();
        }

        const elapsed = deps.now() - started;
        const remaining = TOTAL_BUDGET_MS - elapsed;
        // Don't start an attempt we can't give a fair shot at.
        if (remaining <= 0) break;
        const timeoutMs = Math.min(attempt.timeoutMs, remaining);

        attempted.push(attempt.uri);
        try {
            const sound = await deps.connect(attempt.uri, timeoutMs);
            deps.onHostSucceeded?.(hostOf(attempt.uri));
            return sound;
        } catch (err) {
            if (err instanceof CancelledError) throw err;
            deps.onAttemptFailed?.(attempt.uri, err);
        }
    }

    if (deps.isCancelled?.()) throw new CancelledError();
    throw new AllStreamsFailedError(attempted);
}
