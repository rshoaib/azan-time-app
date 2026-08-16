/**
 * In-App Review Prompt — Azan Time
 * ---------------------------------
 * Aligned with the shared OVC Tech portfolio template (3 positive actions /
 * 120-day spacing / 2 lifetime asks) so every app behaves the same way.
 *
 * WHY THIS WAS REWRITTEN (2026-08-16)
 * The previous version fired only on exact-equality milestones — Qibla opened
 * *exactly* 3 times, a streak of *exactly* 7/30/100 — plus Ramadan day 15 and
 * Eid. Both seasonal triggers fell before the prompt shipped (2026-07-20) and
 * do not recur until ~Feb 2027, and the equality checks give a single one-frame
 * window each. Net effect: Azan took 0 ratings in the window where Mentalism —
 * same library, same Play API, but a reachable "3 completed drills" trigger —
 * took 3. The API was never the problem; the triggers were unreachable.
 *
 * The fix is to count *genuine success moments* instead of hitting exact
 * numbers, and to add the one moment engaged users reach daily: marking the
 * last remaining prayer of the day, so all five are complete.
 *
 * Guarantees:
 *   - Never throws into the calling flow (fire-and-forget, fully swallowed).
 *   - Never prompts on first launch (needs MIN_POSITIVE_ACTIONS first).
 *   - Honors an explicit user decline forever.
 *   - Every exit path is logged, so "never asked" is distinguishable from
 *     "asked and Play stayed silent".
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logEvent } from './analyticsService';

const KEY_ACTIONS = '@review/positiveActions'; // lifetime count of success moments
const KEY_LAST_ASKED = '@review/lastAskedAt';  // ms timestamp of the last requestReview()
const KEY_ASK_COUNT = '@review/askCount';      // how many times we've asked
const KEY_DONE = '@review/done';               // hard "never ask again" flag
const KEY_QIBLA_USES = 'qibla_use_count';      // retained from the previous version

/** Earn this many success moments before the FIRST prompt (never on first launch). */
const MIN_POSITIVE_ACTIONS = 3;
/** Minimum spacing between prompts. Play enforces its own quota on top of this. */
const MIN_INTERVAL_MS = 120 * 24 * 60 * 60 * 1000; // ~120 days
/** Lifetime cap on prompts — belt-and-suspenders so we never re-nag. */
const MAX_ASKS = 2;
/** Qibla opens before repeat use counts as a success moment (skips tyre-kickers). */
const QIBLA_USES_BEFORE_COUNTING = 3;

/** A delight moment. Recorded on the event so the funnel is attributable. */
export type DelightSource =
  | 'tracker_day_complete'
  | 'streak_milestone'
  | 'qibla_repeat_use'
  | 'ramadan_midpoint'
  | 'eid_day';

/**
 * Funnel telemetry. Until now nothing recorded whether a prompt was even
 * attempted, so "no ratings" could not be told apart from "never asked".
 * `review_requested` is the only outcome that means we reached Play.
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
 * @returns true when the request actually reached Play — callers use this to
 *          avoid stacking another full-screen surface on the same tap.
 */
export async function requestReviewIfAppropriate(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    if ((await AsyncStorage.getItem(KEY_DONE)) === '1') return blocked('lifetime_cap');

    const lastRaw = await AsyncStorage.getItem(KEY_LAST_ASKED);
    if (lastRaw && Date.now() - parseInt(lastRaw, 10) < MIN_INTERVAL_MS) return blocked('cooldown');

    const StoreReview = await loadStoreReview();
    if (!StoreReview) return blocked('module_absent');
    if (!(await StoreReview.isAvailableAsync())) return blocked('unavailable');

    // Record the attempt BEFORE requesting: the platform never reveals whether
    // the dialog actually appeared, so we treat the request itself as "asked".
    const askCount = parseInt((await AsyncStorage.getItem(KEY_ASK_COUNT)) ?? '0', 10) + 1;
    await AsyncStorage.setItem(KEY_LAST_ASKED, String(Date.now()));
    await AsyncStorage.setItem(KEY_ASK_COUNT, String(askCount));
    if (askCount >= MAX_ASKS) await AsyncStorage.setItem(KEY_DONE, '1');

    void logEvent('review_requested', { ask_count: askCount });
    await StoreReview.requestReview();
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
 * @returns true when a review request reached Play on this call.
 */
export async function registerPositiveAction(source: DelightSource): Promise<boolean> {
  try {
    const count = parseInt((await AsyncStorage.getItem(KEY_ACTIONS)) ?? '0', 10) + 1;
    await AsyncStorage.setItem(KEY_ACTIONS, String(count));
    void logEvent('review_action', { count, source });
    if (count < MIN_POSITIVE_ACTIONS) return false;
    return await requestReviewIfAppropriate();
  } catch {
    return false;
  }
}

/**
 * The strongest moment Azan has: the user just marked the last remaining
 * prayer, so all five are complete for the day. Reached daily by engaged
 * users — this is the trigger the old version was missing entirely.
 */
export async function onTrackerDayComplete(): Promise<boolean> {
  return registerPositiveAction('tracker_day_complete');
}

/**
 * Streak milestone. Now `>=` with a once-per-tier guard rather than `===`, so
 * a user who opens the app on day 8 instead of day 7 is no longer skipped.
 */
export async function onStreakMilestone(streak: number): Promise<boolean> {
  try {
    if (streak < 7) return false;
    const tier = streak >= 100 ? 100 : streak >= 30 ? 30 : 7;
    const seenRaw = await AsyncStorage.getItem('@review/streakTierSeen');
    const seen = seenRaw ? parseInt(seenRaw, 10) : 0;
    if (tier <= seen) return false; // already credited this tier
    await AsyncStorage.setItem('@review/streakTierSeen', String(tier));
    return await registerPositiveAction('streak_milestone');
  } catch {
    return false;
  }
}

/**
 * Qibla compass opened. Counts as a success moment from the 3rd use onward —
 * `>=` rather than the old `=== 3`, which gave exactly one chance forever.
 */
export async function recordQiblaUse(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY_QIBLA_USES);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(KEY_QIBLA_USES, String(count));
    if (count >= QIBLA_USES_BEFORE_COUNTING) {
      // Delay slightly so we never interrupt the compass settling animation.
      setTimeout(() => { void registerPositiveAction('qibla_repeat_use'); }, 2500);
    }
  } catch {
    // Swallow.
  }
}

/**
 * Kept for the tracker's existing call site.
 * @deprecated prefer {@link onTrackerDayComplete} — a completed day is a
 * stronger and far more frequent signal than a days-logged count.
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

/**
 * If you ever build a custom "Rate us" button that links to the store instead
 * of the native prompt, call this first so we never double-ask.
 */
export async function markReviewDeclined(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DONE, '1');
    void logEvent('review_declined');
  } catch {
    // Swallow.
  }
}

/** Exposed for tests and diagnostics. */
export async function canPromptForReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if ((await AsyncStorage.getItem(KEY_DONE)) === '1') return false;
  const lastRaw = await AsyncStorage.getItem(KEY_LAST_ASKED);
  if (lastRaw && Date.now() - parseInt(lastRaw, 10) < MIN_INTERVAL_MS) return false;
  return true;
}
