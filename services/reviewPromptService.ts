/**
 * In-App Review Prompt Service
 * ---------------------------------
 * Trigger the native App Store / Play Store review dialog at moments of
 * delight — never on first launch, never on error, never more than once
 * per 90 days per user.
 *
 * Moments we consider "delight":
 *   - User has logged 7+ completed prayer days in the tracker
 *   - User has used the Qibla compass 3+ times
 *   - User hits a prayer streak of 7, 30, or 100 days
 *   - Eid al-Fitr / Eid al-Adha day (detected via Hijri calendar)
 *   - Ramadan day 15 (mid-Ramadan, user is emotionally engaged)
 *
 * Platform fallback:
 *   - iOS: SKStoreReviewController (via expo-store-review)
 *   - Android: Google Play In-App Review API (same module)
 *   - Web: no-op
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYS = {
    LAST_PROMPT_DATE: 'review_last_prompt_date',
    PROMPT_COUNT: 'review_prompt_count',
    QIBLA_USE_COUNT: 'qibla_use_count',
    REVIEW_DECLINED: 'review_declined',
};

// Minimum days between prompts (Apple recommends 3 prompts/year max)
const MIN_DAYS_BETWEEN_PROMPTS = 90;
// Max lifetime prompts
const MAX_LIFETIME_PROMPTS = 3;

type DelightTrigger =
    | 'tracker_week_complete'   // 7 days of tracker use
    | 'streak_milestone_7'
    | 'streak_milestone_30'
    | 'streak_milestone_100'
    | 'qibla_third_use'
    | 'ramadan_day_15'
    | 'eid_day';

async function getDaysSinceLastPrompt(): Promise<number> {
    const raw = await AsyncStorage.getItem(KEYS.LAST_PROMPT_DATE);
    if (!raw) return Infinity;
    const last = parseInt(raw, 10);
    return (Date.now() - last) / (1000 * 60 * 60 * 24);
}

async function getPromptCount(): Promise<number> {
    const raw = await AsyncStorage.getItem(KEYS.PROMPT_COUNT);
    return raw ? parseInt(raw, 10) : 0;
}

async function recordPrompt(): Promise<void> {
    const count = await getPromptCount();
    await AsyncStorage.multiSet([
        [KEYS.LAST_PROMPT_DATE, Date.now().toString()],
        [KEYS.PROMPT_COUNT, (count + 1).toString()],
    ]);
}

/**
 * Can we prompt for review right now?
 * Honors Apple's 3/year cap, our 90-day gap, and the user's explicit decline.
 */
export async function canPromptForReview(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    // User explicitly declined → never ask again
    const declined = await AsyncStorage.getItem(KEYS.REVIEW_DECLINED);
    if (declined === 'true') return false;

    const count = await getPromptCount();
    if (count >= MAX_LIFETIME_PROMPTS) return false;

    const days = await getDaysSinceLastPrompt();
    if (days < MIN_DAYS_BETWEEN_PROMPTS) return false;

    return true;
}

/**
 * Call this at a delight moment. It will:
 *   1. Check whether we're allowed to prompt.
 *   2. If yes, trigger the native review dialog.
 *   3. Record the prompt so we don't ask again too soon.
 *
 * The expo-store-review module handles all the platform-specific behavior,
 * including Apple's throttling (which silently suppresses excess prompts).
 */
export async function promptForReview(trigger: DelightTrigger): Promise<void> {
    const allowed = await canPromptForReview();
    if (!allowed) return;

    try {
        // Dynamic import so web builds don't crash.
        // @ts-ignore - module is optional, installed via `npx expo install expo-store-review`
        const StoreReview = await import('expo-store-review').catch(() => null);
        if (!StoreReview) return;

        const available = await StoreReview.isAvailableAsync();
        if (!available) return;

        await StoreReview.requestReview();
        await recordPrompt();

        // Fire-and-forget analytics hook (wire up later when you add an analytics MCP)
        if (__DEV__) console.log(`[review] prompted via trigger: ${trigger}`);
    } catch (e) {
        if (__DEV__) console.warn('[review] prompt failed', e);
    }
}

/**
 * Call when user opens Qibla compass.
 * After 3 successful uses, we consider this a delight moment and prompt.
 */
export async function recordQiblaUse(): Promise<void> {
    const raw = await AsyncStorage.getItem(KEYS.QIBLA_USE_COUNT);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(KEYS.QIBLA_USE_COUNT, count.toString());

    if (count === 3) {
        // Delay slightly so we don't interrupt the compass animation
        setTimeout(() => promptForReview('qibla_third_use'), 2500);
    }
}

/**
 * Call when user reaches a streak milestone.
 */
export async function onStreakMilestone(streak: number): Promise<void> {
    if (streak === 7) await promptForReview('streak_milestone_7');
    else if (streak === 30) await promptForReview('streak_milestone_30');
    else if (streak === 100) await promptForReview('streak_milestone_100');
}

/**
 * Call when user completes 7+ days of tracker usage.
 */
export async function onTrackerMilestone(daysLogged: number): Promise<void> {
    if (daysLogged === 7) {
        await promptForReview('tracker_week_complete');
    }
}

/**
 * Call from the home screen on Eid days (detected via Hijri calendar).
 */
export async function onEidDay(): Promise<void> {
    await promptForReview('eid_day');
}

/**
 * Call from the Ramadan banner on day 15.
 */
export async function onRamadanMidpoint(dayOfRamadan: number): Promise<void> {
    if (dayOfRamadan === 15) {
        await promptForReview('ramadan_day_15');
    }
}

/**
 * If you ever build a custom "Rate us" button that links to the store instead
 * of the native prompt, call this first so we know the user engaged.
 */
export async function markReviewDeclined(): Promise<void> {
    await AsyncStorage.setItem(KEYS.REVIEW_DECLINED, 'true');
}
