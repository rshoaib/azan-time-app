/**
 * In-App Review Prompt — reusable across the OVC Tech app portfolio.
 * ------------------------------------------------------------------
 * Wraps the native Google Play In-App Review API (and iOS SKStoreReview)
 * via expo-store-review. The whole point is to spend Play's scarce review
 * quota on a GENUINE success moment instead of on launch or on a nag screen.
 *
 * How to use:
 *   1. Call `registerPositiveAction()` once at a real "delight" moment
 *      (here: logging a prayer, completing the day, a tasbih target, Qibla).
 *   2. That's it. This module counts positive actions and, once the user
 *      has earned enough context, asks the OS to show its rating dialog —
 *      never on first launch, at most once per interval, and never
 *      re-nagging after the lifetime cap.
 *
 * Guarantees:
 *   - Never throws into the calling flow (fire-and-forget, fully swallowed).
 *   - Never prompts on first launch (needs MIN_POSITIVE_ACTIONS first, and
 *     MIN_FIRST_ACTION_AGE_MS of history behind them).
 *   - A Play-side FAILURE never consumes a lifetime ask (see the long note in
 *     `requestReviewIfAppropriate`).
 *   - Honors an explicit user decline forever.
 *   - Every exit path is logged, so "never asked" is distinguishable from
 *     "asked and Play stayed silent".
 */

// ─────────────────────────────────────────────────────────────────────────────
// APP-LOCAL BINDINGS
// The only part of this file that differs between apps: imports, the storage
// adapter, the key names, and the tuning constants. EVERYTHING BELOW THE
// "SHARED CORE" banner is byte-identical portfolio-wide — fix bugs there once
// and port the whole block verbatim to every app.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logEvent } from './analyticsService';

const getItem = (k: string): Promise<string | null> => AsyncStorage.getItem(k);
const setItem = (k: string, v: string): Promise<void> => AsyncStorage.setItem(k, v);

const KEY_ACTIONS = '@review/positiveActions';       // lifetime count of success moments
const KEY_FIRST_ACTION_AT = '@review/firstActionAt'; // ms timestamp of action #1
const KEY_LAST_ASKED = '@review/lastAskedAt';        // ms timestamp of the last SUCCESSFUL ask
const KEY_LAST_FAILED = '@review/lastFailedAt';      // ms timestamp of the last Play-side failure
const KEY_ASK_COUNT = '@review/askCount';            // how many times Play accepted a request
const KEY_DONE = '@review/done';                     // hard "never ask again" flag
const KEY_QIBLA_USES = 'qibla_use_count';            // retained from the pre-2026-08 version

/** Earn this many success moments before the FIRST prompt (never on first launch). */
const MIN_POSITIVE_ACTIONS = 3;
/**
 * Additional floor: this much time must have passed since the user's FIRST
 * positive action. Azan's triggers are deliberately cheap (a prayer tap
 * counts), so without this a brand-new user could backfill three prayers in one
 * minute and be asked to rate an app they have not lived with yet.
 */
const MIN_FIRST_ACTION_AGE_MS = 24 * 60 * 60 * 1000; // 24h
/** Minimum spacing between prompts. Play enforces its own quota on top of this. */
const MIN_INTERVAL_MS = 45 * 24 * 60 * 60 * 1000; // ~45 days
/** Lifetime cap on prompts — belt-and-suspenders so we never re-nag. */
const MAX_ASKS = 4;
/** After a Play-side failure, wait this long before trying again. */
const FAIL_RETRY_MS = 24 * 60 * 60 * 1000; // 24h
/** Qibla opens before repeat use counts as a success moment (skips tyre-kickers). */
const QIBLA_USES_BEFORE_COUNTING = 3;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CORE — byte-identical in every OVC Tech app. Edit once, port verbatim.
// ─────────────────────────────────────────────────────────────────────────────

/** True for the '1' we write and for any legacy boolean-shaped flag. */
function isSet(v: string | null): boolean {
  return v === '1' || v === 'true';
}

/**
 * Funnel telemetry. `review_requested` is the only outcome that means we
 * reached Play; `review_request_failed` means we reached it and it refused.
 */
function blocked(reason: string): false {
  void logEvent('review_gate_blocked', { reason });
  return false;
}

/**
 * Load expo-store-review lazily so web / Expo Go bundles (where the native
 * module is absent) never crash. Present in native release builds.
 */
async function loadStoreReview(): Promise<null | {
  isAvailableAsync: () => Promise<boolean>;
  requestReview: () => Promise<void>;
}> {
  try {
    // @ts-ignore optional native module, installed via `npx expo install expo-store-review`
    return await import('expo-store-review');
  } catch {
    return null;
  }
}

/**
 * Ask for a review only if every guardrail passes.
 *
 * @returns true when Play accepted and completed the review flow — callers use
 *          this to avoid stacking another full-screen surface on the same tap.
 */
export async function requestReviewIfAppropriate(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    if (isSet(await getItem(KEY_DONE))) return blocked('lifetime_cap');

    const lastRaw = await getItem(KEY_LAST_ASKED);
    if (lastRaw && Date.now() - parseInt(lastRaw, 10) < MIN_INTERVAL_MS) return blocked('cooldown');

    // A Play-side failure is transient (quota, Play Services, sideloaded
    // install). Back off briefly so we retry later rather than on every single
    // action — but never treat it as an ask.
    const failedRaw = await getItem(KEY_LAST_FAILED);
    if (failedRaw && Date.now() - parseInt(failedRaw, 10) < FAIL_RETRY_MS) {
      return blocked('failed_recently');
    }

    const firstRaw = await getItem(KEY_FIRST_ACTION_AT);
    if (firstRaw && Date.now() - parseInt(firstRaw, 10) < MIN_FIRST_ACTION_AGE_MS) {
      return blocked('too_new');
    }

    const StoreReview = await loadStoreReview();
    if (!StoreReview) return blocked('module_absent');
    if (!(await StoreReview.isAvailableAsync())) return blocked('unavailable');

    // Hand the request to Play FIRST, and only record it once it RESOLVES.
    //
    // WHY THIS ORDER MATTERS (fixed 2026-08-23). The Android native module
    // rejects with RMTaskException / RMUnsuccessfulTaskException whenever the
    // review flow cannot run: quota exhausted, no Play account on the device,
    // sideloaded install, Play Services trouble. The previous version wrote
    // lastAskedAt / askCount / done BEFORE awaiting and swallowed the
    // rejection, so every one of those silent failures consumed a lifetime
    // ask — and with MAX_ASKS = 2, two of them disabled the prompt for that
    // user permanently, without a dialog ever having been shown.
    //
    // A resolved promise is the only evidence Play accepted the flow. Note
    // Play also resolves when it suppresses the dialog under its own quota;
    // that genuinely IS an ask and is correctly counted here.
    try {
      await StoreReview.requestReview();
    } catch (e) {
      await setItem(KEY_LAST_FAILED, String(Date.now()));
      const reason = String((e as Error)?.message ?? e).slice(0, 100);
      void logEvent('review_request_failed', { reason });
      return false;
    }

    const askCount = parseInt((await getItem(KEY_ASK_COUNT)) ?? '0', 10) + 1;
    await setItem(KEY_LAST_ASKED, String(Date.now()));
    await setItem(KEY_ASK_COUNT, String(askCount));
    await setItem(KEY_LAST_FAILED, '0'); // a success clears the failure backoff
    if (askCount >= MAX_ASKS) await setItem(KEY_DONE, '1');

    void logEvent('review_requested', { ask_count: askCount });
    return true;
  } catch {
    // Swallow — a review prompt must never break the flow that triggered it.
    return false;
  }
}

/**
 * Call at a genuine success moment. Counts it and, once the user has earned
 * enough context, tries to prompt (subject to all guardrails).
 *
 * @returns true when Play accepted a review request on this call.
 */
export async function registerPositiveAction(source?: string): Promise<boolean> {
  try {
    const count = parseInt((await getItem(KEY_ACTIONS)) ?? '0', 10) + 1;
    await setItem(KEY_ACTIONS, String(count));
    if (count === 1) await setItem(KEY_FIRST_ACTION_AT, String(Date.now()));
    void logEvent('review_action', source ? { count, source } : { count });
    if (count < MIN_POSITIVE_ACTIONS) return false;
    return await requestReviewIfAppropriate();
  } catch {
    return false;
  }
}

/**
 * If you ever build a custom "Rate us" button that links to the store instead
 * of the native prompt, call this first so we never double-ask.
 */
export async function markReviewDeclined(): Promise<void> {
  try {
    await setItem(KEY_DONE, '1');
    void logEvent('review_declined');
  } catch {
    // Swallow.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// APP-SPECIFIC TRIGGERS (Azan Time)
// ─────────────────────────────────────────────────────────────────────────────

/** A delight moment. Recorded on the event so the funnel is attributable. */
export type DelightSource =
  | 'prayer_logged'
  | 'tracker_day_complete'
  | 'streak_milestone'
  | 'tasbih_target'
  | 'qibla_repeat_use'
  | 'ramadan_midpoint'
  | 'eid_day';

/**
 * The app's core loop: the user just marked a prayer as PRAYED. Deliberately
 * the cheapest trigger we have — an engaged user reaches it up to five times a
 * day, which is what brings Azan's reachability in line with Mentalism's
 * "any completed drill". Only 'prayed' counts; being asked to rate the app
 * right after logging a MISSED prayer would be tone-deaf.
 */
export async function onPrayerLogged(): Promise<boolean> {
  return registerPositiveAction('prayer_logged');
}

/**
 * The strongest moment Azan has: the user just marked the last remaining
 * prayer, so all five are complete for the day.
 */
export async function onTrackerDayComplete(): Promise<boolean> {
  return registerPositiveAction('tracker_day_complete');
}

/**
 * Streak milestone. `>=` with a once-per-tier guard rather than `===`, so a
 * user who opens the app on day 8 instead of day 7 is not skipped.
 */
export async function onStreakMilestone(streak: number): Promise<boolean> {
  try {
    if (streak < 7) return false;
    const tier = streak >= 100 ? 100 : streak >= 30 ? 30 : 7;
    const seenRaw = await getItem('@review/streakTierSeen');
    const seen = seenRaw ? parseInt(seenRaw, 10) : 0;
    if (tier <= seen) return false; // already credited this tier
    await setItem('@review/streakTierSeen', String(tier));
    return await registerPositiveAction('streak_milestone');
  } catch {
    return false;
  }
}

/**
 * A dhikr count reached its target (33 / 99 / …). A real completion moment on
 * a screen with no competing surface, and reachable by users who never touch
 * the tracker at all. Credited on the exact target hit, not on every tap past it.
 */
export async function onTasbihTargetReached(count: number, target: number): Promise<boolean> {
  if (!target || count !== target) return false;
  return registerPositiveAction('tasbih_target');
}

/**
 * Qibla compass opened. Counts as a success moment from the 3rd use onward.
 * The caller fires this per screen FOCUS (not per mount) — see qibla.tsx.
 */
export async function recordQiblaUse(): Promise<void> {
  try {
    const raw = await getItem(KEY_QIBLA_USES);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await setItem(KEY_QIBLA_USES, String(count));
    if (count >= QIBLA_USES_BEFORE_COUNTING) {
      // Delay slightly so we never interrupt the compass settling animation.
      setTimeout(() => { void registerPositiveAction('qibla_repeat_use'); }, 2500);
    }
  } catch {
    // Swallow.
  }
}

/**
 * Kept for older call sites.
 * @deprecated prefer {@link onTrackerDayComplete}.
 */
export async function onTrackerMilestone(daysLogged: number): Promise<boolean> {
  if (daysLogged < 7) return false;
  return registerPositiveAction('tracker_day_complete');
}

/** Ramadan day 15. A bonus path — dead most of the year, never the only one. */
export async function onRamadanMidpoint(dayOfRamadan: number): Promise<boolean> {
  if (dayOfRamadan !== 15) return false;
  return registerPositiveAction('ramadan_midpoint');
}

/** Eid al-Fitr / Eid al-Adha. Bonus path, same caveat as Ramadan. */
export async function onEidDay(): Promise<boolean> {
  return registerPositiveAction('eid_day');
}

/** Exposed for tests and diagnostics. */
export async function canPromptForReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (isSet(await getItem(KEY_DONE))) return false;
  const lastRaw = await getItem(KEY_LAST_ASKED);
  if (lastRaw && Date.now() - parseInt(lastRaw, 10) < MIN_INTERVAL_MS) return false;
  return true;
}
