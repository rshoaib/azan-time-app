/**
 * Tests for the in-app review prompt gate.
 *
 * The headline case is the "burned ask" regression fixed 2026-08-23: Play's
 * native module REJECTS whenever the review flow can't run (quota exhausted,
 * sideloaded install, no Play account, Play Services trouble). The old code
 * recorded the ask before awaiting, so those silent failures ate the user's
 * lifetime asks and permanently disabled the prompt. Nothing about that is
 * observable in the UI, which is exactly why it needs a test.
 */

// ── in-memory AsyncStorage ──────────────────────────────────────────────────
let store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const events: { name: string; params?: Record<string, unknown> }[] = [];
jest.mock('@/services/analyticsService', () => ({
  logEvent: jest.fn((name: string, params?: Record<string, unknown>) => {
    events.push({ name, params });
    return Promise.resolve();
  }),
}));

// expo-store-review is loaded via a dynamic import inside the service, so the
// mock has to be swappable between tests.
let isAvailable = true;
let requestReviewImpl: () => Promise<void> = () => Promise.resolve();
let requestReviewCalls = 0;

jest.mock(
  'expo-store-review',
  () => ({
    isAvailableAsync: () => Promise.resolve(isAvailable),
    requestReview: () => {
      requestReviewCalls++;
      return requestReviewImpl();
    },
  }),
  { virtual: true }
);

import {
  registerPositiveAction,
  requestReviewIfAppropriate,
  markReviewDeclined,
  onPrayerLogged,
  onStreakMilestone,
  onTasbihTargetReached,
  onRamadanMidpoint,
  canPromptForReview,
} from '@/services/reviewPromptService';

const DAY = 24 * 60 * 60 * 1000;

/** Age the stored timestamps by `ms` so cooldown/backoff windows elapse. */
function rewind(ms: number) {
  for (const k of ['@review/lastAskedAt', '@review/lastFailedAt', '@review/firstActionAt']) {
    const v = store[k];
    if (v && v !== '0') store[k] = String(parseInt(v, 10) - ms);
  }
}

/** Get past MIN_POSITIVE_ACTIONS and the 24h first-action floor. */
async function earnEligibility() {
  await registerPositiveAction('prayer_logged'); // 1
  rewind(2 * DAY); // the first action is now old enough
  await registerPositiveAction('prayer_logged'); // 2
}

beforeEach(() => {
  store = {};
  events.length = 0;
  isAvailable = true;
  requestReviewCalls = 0;
  requestReviewImpl = () => Promise.resolve();
});

describe('a Play-side failure must never consume a lifetime ask', () => {
  it('does not record an ask when requestReview() rejects', async () => {
    requestReviewImpl = () => Promise.reject(new Error('RMTaskException'));
    await earnEligibility();

    const prompted = await registerPositiveAction('prayer_logged'); // 3 → attempts

    expect(requestReviewCalls).toBe(1);
    expect(prompted).toBe(false);
    expect(store['@review/askCount']).toBeUndefined();
    expect(store['@review/lastAskedAt']).toBeUndefined();
    expect(store['@review/done']).toBeUndefined();
    expect(events.map((e) => e.name)).toContain('review_request_failed');
    expect(events.find((e) => e.name === 'review_request_failed')?.params?.reason)
      .toContain('RMTaskException');
  });

  it('survives four consecutive failures and still prompts once Play recovers', async () => {
    requestReviewImpl = () => Promise.reject(new Error('RMUnsuccessfulTaskException'));
    await earnEligibility();

    for (let i = 0; i < 4; i++) {
      await registerPositiveAction('prayer_logged');
      rewind(2 * DAY); // clear the failure backoff
    }
    expect(requestReviewCalls).toBe(4);
    expect(store['@review/done']).toBeUndefined();

    // Play recovers.
    requestReviewImpl = () => Promise.resolve();
    const prompted = await registerPositiveAction('prayer_logged');

    expect(prompted).toBe(true);
    expect(store['@review/askCount']).toBe('1');
  });

  it('backs off for 24h after a failure instead of retrying on every action', async () => {
    requestReviewImpl = () => Promise.reject(new Error('boom'));
    await earnEligibility();

    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(1);

    await registerPositiveAction('prayer_logged'); // immediately after
    expect(requestReviewCalls).toBe(1); // suppressed, not retried
    expect(events.filter((e) => e.name === 'review_gate_blocked')
      .some((e) => e.params?.reason === 'failed_recently')).toBe(true);

    rewind(2 * DAY);
    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(2); // retried once the window elapsed
  });

  it('clears the failure backoff after a success', async () => {
    requestReviewImpl = () => Promise.reject(new Error('boom'));
    await earnEligibility();
    await registerPositiveAction('prayer_logged');
    expect(store['@review/lastFailedAt']).toBeDefined();

    rewind(2 * DAY);
    requestReviewImpl = () => Promise.resolve();
    await registerPositiveAction('prayer_logged');

    expect(store['@review/lastFailedAt']).toBe('0');
  });
});

describe('the happy path still gates correctly', () => {
  it('never prompts before MIN_POSITIVE_ACTIONS', async () => {
    rewind(0);
    await registerPositiveAction('prayer_logged');
    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(0);
  });

  it('never prompts within 24h of the very first action', async () => {
    await registerPositiveAction('prayer_logged');
    await registerPositiveAction('prayer_logged');
    const prompted = await registerPositiveAction('prayer_logged');

    expect(prompted).toBe(false);
    expect(requestReviewCalls).toBe(0);
    expect(events.filter((e) => e.name === 'review_gate_blocked')
      .some((e) => e.params?.reason === 'too_new')).toBe(true);
  });

  it('prompts once eligible and records the ask', async () => {
    await earnEligibility();
    const prompted = await registerPositiveAction('prayer_logged');

    expect(prompted).toBe(true);
    expect(store['@review/askCount']).toBe('1');
    expect(store['@review/lastAskedAt']).toBeDefined();
    expect(events.find((e) => e.name === 'review_requested')?.params?.ask_count).toBe(1);
  });

  it('respects the cooldown between asks', async () => {
    await earnEligibility();
    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(1);

    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(1);
    expect(events.filter((e) => e.name === 'review_gate_blocked')
      .some((e) => e.params?.reason === 'cooldown')).toBe(true);
  });

  it('stops permanently after MAX_ASKS successful asks', async () => {
    await earnEligibility();
    for (let i = 0; i < 4; i++) {
      await registerPositiveAction('prayer_logged');
      rewind(60 * DAY); // past the 45-day cooldown
    }
    expect(requestReviewCalls).toBe(4);
    expect(store['@review/done']).toBe('1');

    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(4);
    expect(await canPromptForReview()).toBe(false);
  });

  it('honors an explicit decline forever', async () => {
    await markReviewDeclined();
    await earnEligibility();
    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(0);
  });

  it('treats a legacy boolean done flag as done', async () => {
    store['@review/done'] = 'true';
    expect(await requestReviewIfAppropriate()).toBe(false);
    expect(requestReviewCalls).toBe(0);
  });

  it('blocks when Play reports the store is unavailable', async () => {
    isAvailable = false;
    await earnEligibility();
    await registerPositiveAction('prayer_logged');
    expect(requestReviewCalls).toBe(0);
    expect(events.filter((e) => e.name === 'review_gate_blocked')
      .some((e) => e.params?.reason === 'unavailable')).toBe(true);
  });

  it('never throws out of the calling flow', async () => {
    requestReviewImpl = () => {
      throw new Error('synchronous explosion');
    };
    await earnEligibility();
    await expect(registerPositiveAction('prayer_logged')).resolves.toBe(false);
  });
});

describe('Azan trigger reachability', () => {
  it('counts a logged prayer as a success moment', async () => {
    await onPrayerLogged();
    expect(store['@review/positiveActions']).toBe('1');
    expect(events.find((e) => e.name === 'review_action')?.params?.source).toBe('prayer_logged');
  });

  it('credits a streak tier only once, and uses >= not ===', async () => {
    expect(await onStreakMilestone(6)).toBe(false); // below the floor
    await onStreakMilestone(8); // day 8 still credits the 7-tier
    expect(store['@review/streakTierSeen']).toBe('7');
    const before = store['@review/positiveActions'];
    await onStreakMilestone(9); // same tier — no double credit
    expect(store['@review/positiveActions']).toBe(before);
    await onStreakMilestone(31); // next tier up
    expect(store['@review/streakTierSeen']).toBe('30');
  });

  it('credits a tasbih target exactly once, on the target hit', async () => {
    expect(await onTasbihTargetReached(32, 33)).toBe(false);
    await onTasbihTargetReached(33, 33);
    expect(store['@review/positiveActions']).toBe('1');
    await onTasbihTargetReached(34, 33); // past the target — not again
    expect(store['@review/positiveActions']).toBe('1');
  });

  it('ignores a missing tasbih target rather than counting every tap', async () => {
    expect(await onTasbihTargetReached(0, 0)).toBe(false);
    expect(store['@review/positiveActions']).toBeUndefined();
  });

  it('only fires the Ramadan bonus path on day 15', async () => {
    expect(await onRamadanMidpoint(14)).toBe(false);
    await onRamadanMidpoint(15);
    expect(store['@review/positiveActions']).toBe('1');
  });
});
