/**
 * CORE FUNCTION smoke — the app's primary jobs work end to end.
 *
 * Under EXPO_PUBLIC_E2E the clock and location are frozen (London, fixed instant),
 * so prayer names and countdowns are deterministic — see services/e2eConfig.ts.
 */
const { TAB, goToTab, launchFresh } = require('./helpers');

describe('Core functionality', () => {
  beforeAll(async () => {
    await launchFresh();
  });

  it('loads prayer times on the Home tab', async () => {
    await waitFor(element(by.text('NEXT PRAYER')))
      .toBeVisible()
      .withTimeout(90000);
    // Deterministic under the frozen E2E clock/location.
    await expect(element(by.text('Dhuhr'))).toBeVisible();
    await expect(element(by.text('London'))).toBeVisible();
    await expect(element(by.text("Today's Prayers"))).toBeVisible();
  });

  it('opens the Tracker and can log a prayer', async () => {
    await goToTab(TAB.tracker);
    await expect(element(by.id('tracker-prayer-fajr'))).toBeVisible();
    await element(by.id('tracker-prayer-fajr')).tap(); // not-logged → prayed
    await expect(element(by.text('1/5'))).toBeVisible();
  });

  it('navigates through the remaining primary tabs', async () => {
    await goToTab(TAB.dua);
    await expect(element(by.id('dua-tasbih-counter'))).toBeVisible();

    await goToTab(TAB.qibla);
    await expect(element(by.text('QIBLA'))).toBeVisible();

    await goToTab(TAB.tilawat);
    await expect(element(by.text('Quran recitations, anytime'))).toBeVisible();

    await goToTab(TAB.settings);
    await expect(element(by.text('Customize your Azan experience'))).toBeVisible();
  });
});
