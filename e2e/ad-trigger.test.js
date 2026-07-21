/**
 * AD-TRIGGER REGRESSION — the reason this Detox harness exists.
 *
 * Locks in the ad-placement fix so it can never silently regress:
 *   1. Returning to Home (tab navigation) must NEVER fire an interstitial.
 *      (The old bug fired one on every return-to-Home in useFocusEffect.)
 *   2. A genuine completion (marking the last prayer of the day) MUST fire one.
 *   3. The pinned banner is present and NOT clipped by the tab/navigation bar.
 *
 * How it observes the interstitial without a real full-screen ad blocking the
 * run: under EXPO_PUBLIC_E2E the ads service records show-decisions in a counter
 * instead of calling native show() (see services/adsService.ts). The counter is
 * surfaced as a hidden Settings row, testID="e2e-interstitial-count".
 *
 * Requires the app running the E2E seam:
 *   • debug   → `npm run start:e2e` (Metro with EXPO_PUBLIC_E2E=1)
 *   • release → built with EXPO_PUBLIC_E2E=1 (see .detoxrc.js android.release)
 */
const { TAB, goToTab, readCounter, launchFresh } = require('./helpers');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

describe('Ad trigger placement', () => {
  beforeEach(async () => {
    await launchFresh(); // fresh install state: empty tracker, zeroed counters
    await waitFor(element(by.text('NEXT PRAYER')))
      .toBeVisible()
      .withTimeout(90000);
  });

  it('does NOT fire an interstitial when returning to Home from another tab', async () => {
    // Baseline: no interstitials yet.
    await goToTab(TAB.settings);
    expect(await readCounter('e2e-interstitial-count')).toBe(0);

    // Bounce around the tabs and back to Home several times — the exact
    // navigation that used to pop an ad on every return.
    for (let i = 0; i < 3; i++) {
      await goToTab(TAB.tracker);
      await goToTab(TAB.home);
      await goToTab(TAB.dua);
      await goToTab(TAB.home);
    }

    // Still zero: navigation is not a completion moment.
    await goToTab(TAB.settings);
    expect(await readCounter('e2e-interstitial-count')).toBe(0);
  });

  it('fires exactly one interstitial when the day is completed', async () => {
    await goToTab(TAB.settings);
    expect(await readCounter('e2e-interstitial-count')).toBe(0);

    // Mark all five prayers prayed (each tap: not-logged → prayed). The FIFTH
    // tap is the completion moment that fires the interstitial.
    await goToTab(TAB.tracker);
    for (const p of PRAYERS) {
      await element(by.id(`tracker-prayer-${p}`)).tap();
    }

    await goToTab(TAB.settings);
    expect(await readCounter('e2e-interstitial-count')).toBe(1);
  });

  it('shows the pinned banner above the tab bar, not clipped', async () => {
    // Present on Home...
    await expect(element(by.id('ad-banner'))).toBeVisible();
    // ...and still present after switching tabs (it's mounted once, globally).
    await goToTab(TAB.tracker);
    // toBeVisible() defaults to a ≥75% on-screen threshold, so a banner clipped
    // by the navigation/gesture bar would fail here — this is the clip guard.
    await expect(element(by.id('ad-banner'))).toBeVisible();
  });
});
