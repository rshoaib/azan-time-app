/**
 * Interstitial safety-guard tests.
 *
 * Context: on v1.2.0 this app's observed CTRs were 9.8% (banner), 21.6%
 * (interstitial) and 43.8% (app open) against a 1-3% norm. That is the
 * accidental-click signature AdMob's invalid-traffic systems flag, and the
 * likely origin of the earlier suspension warning. The tracker row cycles
 * status on every tap (null -> prayed -> missed -> qada), so users tap it
 * repeatedly; an ad rendered on the completing tap can swallow the next one.
 *
 * These tests lock in the guards that make that impossible:
 *   - no interstitial within the quiet window after a tap,
 *   - every tap re-arms that window,
 *   - no interstitial while the app is not foregrounded,
 *   - the pre-existing 4-min / 5-per-day caps still hold.
 *
 * E2E mode is forced on so maybeShowInterstitial() takes its deterministic
 * record-the-decision path instead of reaching for a native ad — the guards
 * under test all run BEFORE that branch, so they are exercised for real.
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));

const mockAppState = { currentState: 'active' as string };

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (o: any) => (o && 'android' in o ? o.android : o?.default),
  },
  AppState: mockAppState,
}));

jest.mock('@/services/e2eConfig', () => ({ E2E: true }));

const QUIET_MS = 1200; // INTERSTITIAL_TAP_QUIET_MS
const MIN_INTERVAL_MS = 4 * 60 * 1000;
const START = new Date('2026-08-28T09:00:00.000Z').getTime();

type AdsModule = typeof import('@/services/adsService');

/** Fresh module instance — the service keeps its cap state in module scope. */
function freshAds(): AdsModule {
  let mod: AdsModule;
  jest.isolateModules(() => {
    mod = require('@/services/adsService');
  });
  return mod!;
}

beforeEach(() => {
  mockAppState.currentState = 'active';
  jest.useFakeTimers();
  jest.setSystemTime(START);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('tap quiet window', () => {
  test('a tap suppresses the interstitial for the whole quiet window', () => {
    const ads = freshAds();
    ads.noteUserTap();

    expect(ads.maybeShowInterstitial()).toBe(false);

    jest.setSystemTime(START + QUIET_MS - 1);
    expect(ads.maybeShowInterstitial()).toBe(false);
  });

  test('the interstitial is allowed once the quiet window has elapsed', () => {
    const ads = freshAds();
    ads.noteUserTap();

    jest.setSystemTime(START + QUIET_MS + 1);
    expect(ads.maybeShowInterstitial()).toBe(true);
  });

  test('a second tap re-arms the window — the repeat-tap case that caused the CTR spike', () => {
    const ads = freshAds();
    ads.noteUserTap();

    // User taps again 1s later (still cycling the prayer row).
    jest.setSystemTime(START + 1000);
    ads.noteUserTap();

    // The ORIGINAL window has now expired, but the second tap's has not.
    jest.setSystemTime(START + QUIET_MS + 1);
    expect(ads.maybeShowInterstitial()).toBe(false);

    // Only once the window from the LAST tap clears does an ad become eligible.
    jest.setSystemTime(START + 1000 + QUIET_MS + 1);
    expect(ads.maybeShowInterstitial()).toBe(true);
  });

  test('with no tap at all the guard does not block (azan-finish path)', () => {
    const ads = freshAds();
    expect(ads.maybeShowInterstitial()).toBe(true);
  });

  test('the exported post-tap delay actually outlasts the quiet window', () => {
    const ads = freshAds();
    expect(ads.INTERSTITIAL_POST_TAP_DELAY_MS).toBeGreaterThan(QUIET_MS);

    ads.noteUserTap();
    jest.setSystemTime(START + ads.INTERSTITIAL_POST_TAP_DELAY_MS);
    expect(ads.maybeShowInterstitial()).toBe(true);
  });
});

describe('foreground guard', () => {
  test.each(['background', 'inactive'])(
    'no interstitial while the app is %s',
    (state) => {
      const ads = freshAds();
      mockAppState.currentState = state;
      expect(ads.maybeShowInterstitial()).toBe(false);
    },
  );

  test('returning to the foreground makes it eligible again', () => {
    const ads = freshAds();
    mockAppState.currentState = 'background';
    expect(ads.maybeShowInterstitial()).toBe(false);

    mockAppState.currentState = 'active';
    expect(ads.maybeShowInterstitial()).toBe(true);
  });
});

describe('frequency caps still hold', () => {
  test('at most one show inside the 4-minute interval', () => {
    const ads = freshAds();
    expect(ads.maybeShowInterstitial()).toBe(true);

    jest.setSystemTime(START + MIN_INTERVAL_MS - 1000);
    expect(ads.maybeShowInterstitial()).toBe(false);

    jest.setSystemTime(START + MIN_INTERVAL_MS + 1);
    expect(ads.maybeShowInterstitial()).toBe(true);
  });

  test('at most five shows per day, and the sixth is refused', () => {
    const ads = freshAds();
    let t = START;
    for (let i = 0; i < 5; i++) {
      jest.setSystemTime(t);
      expect(ads.maybeShowInterstitial()).toBe(true);
      t += MIN_INTERVAL_MS + 1000;
    }
    jest.setSystemTime(t);
    expect(ads.maybeShowInterstitial()).toBe(false);
    expect(ads.e2eGetInterstitialShown()).toBe(5);
  });

  test('an explicit isBusy() (azan playing) suppresses the ad', () => {
    const ads = freshAds();
    expect(ads.maybeShowInterstitial({ isBusy: () => true })).toBe(false);
    expect(ads.maybeShowInterstitial({ isBusy: () => false })).toBe(true);
  });
});

describe('ad unit configuration', () => {
  test('the Android interstitial unit is the real "Home Interstitial" from AdMob', () => {
    const ads = freshAds();
    // Copied from the AdMob console ad-unit list for app ~7372137520. Shipping
    // a unit that does not exist fails BEFORE the request reaches AdMob, so it
    // logs zero requests rather than an error — exactly the silent failure that
    // kept this interstitial dead from v1.3.5 through v1.3.12.
    expect(ads.AD_UNIT_IDS.interstitialMain.android).toBe(
      'ca-app-pub-3166995085202346/1266065927',
    );
    expect(ads.AD_UNIT_IDS.bannerHome.android).toBe(
      'ca-app-pub-3166995085202346/5942887541',
    );
  });

  test('banner and interstitial are distinct units', () => {
    const ads = freshAds();
    expect(ads.AD_UNIT_IDS.interstitialMain.android).not.toBe(
      ads.AD_UNIT_IDS.bannerHome.android,
    );
  });
});
