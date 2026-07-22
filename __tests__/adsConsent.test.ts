/**
 * Consent-path regression tests (worldwide-NPA bug).
 *
 * The old logic consulted AdsConsent.getUserChoices() unconditionally. Outside
 * EEA/UK/CH the UMP form never runs and no TCF string exists, so the decoded
 * choices model is all-false and every ad request went out with npa=1 for the
 * entire non-GDPR audience. The decision must be status-first:
 *   NOT_REQUIRED → personalized; OBTAINED → honor recorded TCF choices;
 *   anything else → NPA.
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (o: any) => (o && 'android' in o ? o.android : o?.default),
  },
}));

import {
  evaluatePersonalizedAdsAllowed,
  resolveUmpConsent,
} from '@/services/adsService';

const STATUS = {
  UNKNOWN: 'UNKNOWN',
  REQUIRED: 'REQUIRED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  OBTAINED: 'OBTAINED',
} as const;

describe('resolveUmpConsent (status-first decision)', () => {
  test('NOT_REQUIRED (non-EEA) → personalized allowed, TCF choices NOT consulted', async () => {
    // getUserChoices models the empty-TCF decode that caused the bug:
    // everything false even though the user never saw (or needed) a form.
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.NOT_REQUIRED,
        isConsentFormAvailable: false,
      }),
      loadAndShowConsentFormIfRequired: jest.fn(),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: false }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(true);
    expect(AdsConsent.getUserChoices).not.toHaveBeenCalled();
    expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  });

  test('OBTAINED in a previous session with personalized consent → personalized', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.OBTAINED,
        isConsentFormAvailable: true,
      }),
      loadAndShowConsentFormIfRequired: jest.fn(),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: true }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(true);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  });

  test('EEA user shown the form and ACCEPTS → personalized', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.REQUIRED,
        isConsentFormAvailable: true,
      }),
      loadAndShowConsentFormIfRequired: jest
        .fn()
        .mockResolvedValue({ status: STATUS.OBTAINED }),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: true }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(true);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  test('EEA user shown the form and DECLINES personalized → NPA (GDPR preserved)', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.REQUIRED,
        isConsentFormAvailable: true,
      }),
      loadAndShowConsentFormIfRequired: jest
        .fn()
        .mockResolvedValue({ status: STATUS.OBTAINED }),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: false }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(false);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
    expect(AdsConsent.getUserChoices).toHaveBeenCalledTimes(1);
  });

  test('REQUIRED but form unavailable → NPA (never "always personalized")', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.REQUIRED,
        isConsentFormAvailable: false,
      }),
      loadAndShowConsentFormIfRequired: jest.fn(),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: true }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(false);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  });

  test('form returns void (older SDK) → status re-queried via getConsentInfo', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockResolvedValue({
        status: STATUS.REQUIRED,
        isConsentFormAvailable: true,
      }),
      loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(undefined),
      getConsentInfo: jest.fn().mockResolvedValue({ status: STATUS.OBTAINED }),
      getUserChoices: jest.fn().mockResolvedValue({ selectPersonalisedAds: true }),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).resolves.toBe(true);
  });

  test('UMP error propagates so the caller stays NPA and schedules a retry', async () => {
    const AdsConsent = {
      requestInfoUpdate: jest.fn().mockRejectedValue(new Error('network down')),
    };
    await expect(resolveUmpConsent(AdsConsent, STATUS)).rejects.toThrow('network down');
  });

  test('no UMP API at all → NPA (policy-safe)', async () => {
    await expect(resolveUmpConsent(undefined, STATUS)).resolves.toBe(false);
    await expect(resolveUmpConsent({}, STATUS)).resolves.toBe(false);
  });
});

describe('evaluatePersonalizedAdsAllowed', () => {
  test('UNKNOWN → NPA', async () => {
    await expect(
      evaluatePersonalizedAdsAllowed({}, STATUS, STATUS.UNKNOWN),
    ).resolves.toBe(false);
  });

  test('undefined status never matches a missing enum (both undefined) → NPA', async () => {
    await expect(
      evaluatePersonalizedAdsAllowed({}, undefined, undefined),
    ).resolves.toBe(false);
  });

  test('OBTAINED without a getUserChoices API → allowed (native SDK enforces TCF)', async () => {
    await expect(
      evaluatePersonalizedAdsAllowed({}, STATUS, STATUS.OBTAINED),
    ).resolves.toBe(true);
  });
});
