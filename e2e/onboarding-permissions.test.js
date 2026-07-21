/**
 * ONBOARDING / PERMISSIONS — the app comes up cleanly whether or not the user
 * grants notification permission, and reaches its main screen either way.
 *
 * Detox grants/denies OS permissions at launch (no brittle system-dialog tapping).
 * The deeper "real system dialog" path is covered by the Maestro flow
 * .maestro/notification-permission.yaml.
 */
const { launchFresh } = require('./helpers');

describe('Onboarding & permissions', () => {
  it('reaches the prayers screen with notifications GRANTED', async () => {
    await launchFresh({ permissions: { notifications: 'YES', location: 'inuse' } });
    await waitFor(element(by.text('NEXT PRAYER')))
      .toBeVisible()
      .withTimeout(90000);
    await expect(element(by.text("Today's Prayers"))).toBeVisible();
  });

  it('still functions with notifications DENIED (no hard dependency)', async () => {
    await launchFresh({ permissions: { notifications: 'NO', location: 'inuse' } });
    // Prayer times are computed locally; the app must not gate its core UI on the
    // notification grant.
    await waitFor(element(by.text('NEXT PRAYER')))
      .toBeVisible()
      .withTimeout(90000);
    await expect(element(by.text("Today's Prayers"))).toBeVisible();
  });
});
