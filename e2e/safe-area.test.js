/**
 * SAFE-AREA / EDGE-TO-EDGE — on an edge-to-edge device (edgeToEdgeEnabled=true,
 * new arch), the app chrome must sit inside the safe area: nothing important is
 * hidden under the status bar or clipped by the bottom navigation/gesture bar.
 *
 * Run this on a REAL gesture-nav device (the S25 Ultra) where the bottom inset is
 * non-zero — that's where clipping regressions actually show up.
 */
const { TAB, goToTab, launchFresh } = require('./helpers');

describe('Safe area / edge-to-edge', () => {
  beforeAll(async () => {
    await launchFresh();
    await waitFor(element(by.text('NEXT PRAYER')))
      .toBeVisible()
      .withTimeout(90000);
  });

  it('keeps the bottom tab bar reachable above the navigation bar', async () => {
    // If a tab label were under the gesture bar it would fail the visibility
    // threshold (and tapping it would miss).
    await expect(element(by.text(TAB.settings))).toBeVisible();
    await goToTab(TAB.settings);
    await expect(element(by.text('Customize your Azan experience'))).toBeVisible();
  });

  it('keeps the pinned banner clear of the navigation bar on every tab', async () => {
    for (const tab of [TAB.home, TAB.tracker, TAB.qibla, TAB.settings]) {
      await goToTab(tab);
      // ≥75% visible: a banner clipped by the bottom inset fails here.
      await expect(element(by.id('ad-banner'))).toBeVisible();
    }
  });

  it('does not hide the header content under the status bar', async () => {
    await goToTab(TAB.home);
    await expect(element(by.text('NEXT PRAYER'))).toBeVisible();
  });
});
