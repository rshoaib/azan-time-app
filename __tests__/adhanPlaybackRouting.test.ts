/**
 * Adhan playback routing + double-playback guard (v1.3.14).
 *
 * Context: before v1.3.14 the full adhan was bound to the notification CHANNEL
 * sound. Android hands channel sounds to the system notification player
 * (usage=USAGE_NOTIFICATION, CONTENT_TYPE_SONIFICATION), which truncates
 * anything longer than a chime — so a 197s adhan came out as a fragment and was
 * reported as "the short azan". The fix moves full-adhan playback into a native
 * foreground service using USAGE_ALARM, and posts the prayer notification on a
 * channel created with setSound(null, null).
 *
 * That creates one serious hazard: the service fires in the foreground TOO, so
 * leaving the old expo-audio playAzan() path active would play two adhans at
 * once — exactly the regression commit a8859a7 already fixed once.
 *
 * These tests pin the JS half of that contract, which is the part most likely to
 * regress later. The native audio itself needs a device; the DECISION logic does
 * not, and it is what silently rots when someone edits the channel table:
 *
 *   - full adhan + service available  -> silent channel, NO channel sound,
 *                                        alarms handed to the service
 *   - short azan                      -> old sounded channel, service NOT armed
 *                                        and any stale alarms cancelled
 *   - azan off                        -> default channel, service NOT armed
 *   - service unavailable (iOS/Go)    -> falls back to the old sounded channels
 *                                        rather than scheduling silence
 *   - the foreground guard            -> playAzan() is NOT called when the
 *                                        service owns playback, and IS called
 *                                        when it does not
 *
 * The last one is the double-adhan guard itself. Note it is defence in depth:
 * the primary guarantee is structural (the channel is created with no sound at
 * all, so there is nothing to race). This test covers the second layer.
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

// ─── expo-notifications ──────────────────────────────────────────────────────

type ScheduledCall = {
    channelId?: string;
    sound?: string | boolean;
    prayer?: string;
    date?: Date;
};

const scheduled: ScheduledCall[] = [];
const channels: Array<{ id: string; opts: any }> = [];
let receivedListener: ((n: any) => void | Promise<void>) | null = null;
const cancelAllScheduled = jest.fn(async () => {});

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn((cb: any) => {
        receivedListener = cb;
        return { remove: jest.fn() };
    }),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    setNotificationChannelAsync: jest.fn(async (id: string, opts: any) => {
        channels.push({ id, opts });
    }),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    cancelAllScheduledNotificationsAsync: cancelAllScheduled,
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    scheduleNotificationAsync: jest.fn(async (req: any) => {
        scheduled.push({
            channelId: req?.trigger?.channelId,
            sound: req?.content?.sound,
            prayer: req?.content?.data?.prayer,
            date: req?.trigger?.date,
        });
        return 'id';
    }),
    AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2 },
    AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
    SchedulableTriggerInputTypes: { DATE: 'date' },
}));

// ─── the native module ───────────────────────────────────────────────────────

// Typed args so `.mock.calls[0][0]` is reachable in the horizon assertions.
const nativeSchedule = jest.fn(
    (_times: number[], _sounds: string[], _title: string, _body: string) => 1,
);
const nativeCancelAll = jest.fn(() => true);
const ensureSilentChannel = jest.fn(() => true);
const ensureRearmWorker = jest.fn(() => true);

/** Fire-time records the native side is holding for upload (v1.3.15). */
let firedLog: any[] = [];
/** Remaining alarm cover reported by the native side (v1.3.15). */
let horizon: any = null;

function makeNativeModule() {
    return {
        ensureSilentChannel,
        schedule: nativeSchedule,
        cancelAll: nativeCancelAll,
        ensureRearmWorker,
        horizonInfo: jest.fn(() => horizon),
        drainFiredLog: jest.fn(() => JSON.stringify(firedLog)),
        playNow: jest.fn(),
        stop: jest.fn(),
        isPlaying: jest.fn(() => false),
    };
}

/** Swapped to null to simulate iOS / Expo Go / a build without the module. */
let nativeModule: any = makeNativeModule();

jest.mock('@/modules/adhan-playback', () => ({
    __esModule: true,
    get default() {
        return nativeModule;
    },
    isAdhanServiceAvailable: () => nativeModule != null,
    addAdhanFinishedListener: jest.fn(() => () => {}),
    // Mirror the real helpers: both swallow everything and return an empty
    // value when the module is absent, so the app-open path cannot throw.
    drainFiredLog: () => (nativeModule ? firedLog : []),
    getHorizonInfo: () => (nativeModule ? horizon : null),
}));

// ─── audio + analytics + ads ─────────────────────────────────────────────────

const playAzan = jest.fn();
jest.mock('@/services/audioService', () => ({ playAzan, stopAzan: jest.fn() }));
jest.mock('@/services/adsService', () => ({ maybeShowInterstitial: jest.fn() }));
jest.mock('@/services/analyticsService', () => ({
    maybeFireNotificationGranted: jest.fn(),
    maybeFireFirstPrayerAlarm: jest.fn(),
    maybeFireFirstAdhanHeard: jest.fn(),
    logEvent: jest.fn(),
}));

// ─── storage (the settings that drive the routing) ───────────────────────────

const settings = {
    azanSound: true,
    azanShort: false,
    reciter: 'mishary',
};

/**
 * null keeps the routing tests to one clean day of prayers. The horizon tests
 * set a real location so the 30-day extension actually runs through the real
 * `adhan` calculation — the thing whose duplication into Kotlin the design
 * deliberately avoids.
 */
let savedLocation: any = null;

jest.mock('@/services/storageService', () => ({
    getAzanSoundEnabled: jest.fn(async () => settings.azanSound),
    getAzanShortEnabled: jest.fn(async () => settings.azanShort),
    getAzanReciter: jest.fn(async () => settings.reciter),
    getCalculationMethod: jest.fn(async () => 'MuslimWorldLeague'),
    getMadhab: jest.fn(async () => 'shafi'),
    getSavedLocation: jest.fn(async () => savedLocation),
}));

// ─── fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-29T09:00:00.000Z').getTime();

/** Two prayers, both in the future, one of them Fajr (its own recording). */
function prayers() {
    return [
        { name: 'fajr', time: new Date(NOW + 60 * 60 * 1000) },
        { name: 'dhuhr', time: new Date(NOW + 2 * 60 * 60 * 1000) },
    ] as any;
}

const ALL_ENABLED = {
    fajr: true,
    sunrise: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
} as any;

type NotifModule = typeof import('@/services/notificationService');

function freshService(): NotifModule {
    let mod: NotifModule;
    jest.isolateModules(() => {
        mod = require('@/services/notificationService');
    });
    return mod!;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    scheduled.length = 0;
    channels.length = 0;
    receivedListener = null;
    settings.azanSound = true;
    settings.azanShort = false;
    settings.reciter = 'mishary';
    firedLog = [];
    horizon = null;
    savedLocation = null;
    nativeModule = makeNativeModule();
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── routing ─────────────────────────────────────────────────────────────────

describe('full adhan routes through the native service', () => {
    it('posts on the silent channel with no channel sound', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        expect(scheduled).toHaveLength(2);
        for (const s of scheduled) {
            expect(s.channelId).toBe('prayer-azan-silent-v3');
            // `false`, not a filename and not `true` — the OS must play nothing.
            // This is what makes a double adhan impossible rather than unlikely.
            expect(s.sound).toBe(false);
        }
    });

    it('hands the same instants to the service, with Fajr on its own recording', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        expect(nativeSchedule).toHaveBeenCalledTimes(1);
        const [times, sounds] = nativeSchedule.mock.calls[0] as any;

        expect(times).toEqual(prayers().map((p: any) => p.time.getTime()));
        // res/raw names, no .mp3 extension — getIdentifier() takes the bare name.
        expect(sounds).toEqual(['azan_fajr', 'azan_mishary']);
    });

    it('honours advanceMinutes in the service alarms, not just the notification', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 10);

        const [times] = nativeSchedule.mock.calls[0] as any;
        const expected = prayers().map((p: any) => p.time.getTime() - 10 * 60 * 1000);
        // A drift here would play the adhan at a different moment from the
        // notification it belongs to.
        expect(times).toEqual(expected);
    });

    it('creates the silent channel natively (expo-notifications cannot express it)', async () => {
        const svc = freshService();
        await svc.requestNotificationPermission();
        expect(ensureSilentChannel).toHaveBeenCalledWith(
            'prayer-azan-silent-v3',
            expect.any(String),
            expect.any(String),
        );
    });
});

describe('short azan keeps the old sounded path', () => {
    beforeEach(() => {
        settings.azanShort = true;
    });

    it('uses the short channel and the bundled short file', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        for (const s of scheduled) {
            expect(s.channelId).toBe('prayer-azan-short');
            expect(s.sound).toBe('azanshort.mp3');
        }
    });

    it('does not arm the service, and clears stale alarms from a previous setting', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        expect(nativeSchedule).not.toHaveBeenCalled();
        // Without this, flipping full -> short would leave the old full-adhan
        // alarms armed and the user would hear BOTH.
        expect(nativeCancelAll).toHaveBeenCalled();
    });
});

describe('azan disabled', () => {
    beforeEach(() => {
        settings.azanSound = false;
    });

    it('uses the plain channel and does not arm the service', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        for (const s of scheduled) {
            expect(s.channelId).toBe('prayer-times');
            expect(s.sound).toBe(true);
        }
        expect(nativeSchedule).not.toHaveBeenCalled();
        expect(nativeCancelAll).toHaveBeenCalled();
    });
});

describe('service unavailable (iOS, Expo Go, older build)', () => {
    beforeEach(() => {
        nativeModule = null;
    });

    it('falls back to the old sounded channels rather than scheduling silence', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const fajr = scheduled.find((s) => s.prayer === 'fajr')!;
        const dhuhr = scheduled.find((s) => s.prayer === 'dhuhr')!;

        // The truncation bug is preferable to no adhan at all: if the service is
        // missing we must NOT leave the user on a silent channel.
        expect(fajr.channelId).toBe('prayer-azan-fajr-v2');
        expect(fajr.sound).toBe('azan_fajr.mp3');
        expect(dhuhr.channelId).toBe('prayer-azan-mishary');
        expect(dhuhr.sound).toBe('azan_mishary.mp3');
    });
});

// ─── the double-playback guard ───────────────────────────────────────────────

describe('double-playback guard (the a8859a7 regression)', () => {
    /** Boot the module so its foreground listener is registered, then fire it. */
    async function fireForegroundNotification(prayer = 'dhuhr') {
        const svc = freshService();
        await svc.requestNotificationPermission(); // forces getNotifications()
        expect(receivedListener).toBeTruthy();
        await receivedListener!({
            request: { content: { data: { prayer } } },
        });
    }

    it('does NOT call playAzan when the service owns the full adhan', async () => {
        await fireForegroundNotification();
        // The service fires from its own alarm in the foreground too. Calling
        // playAzan() here as well is precisely the double adhan.
        expect(playAzan).not.toHaveBeenCalled();
    });

    it('DOES call playAzan for the short azan, which the service never owns', async () => {
        settings.azanShort = true;
        await fireForegroundNotification();
        expect(playAzan).toHaveBeenCalledTimes(1);
    });

    it('DOES call playAzan when the native service is unavailable', async () => {
        nativeModule = null;
        await fireForegroundNotification('fajr');
        // Otherwise iOS / Expo Go would lose foreground playback entirely.
        expect(playAzan).toHaveBeenCalledTimes(1);
        expect(playAzan).toHaveBeenCalledWith('fajr', { adOnFinish: true });
    });

    it('does not play anything when azan sound is off', async () => {
        settings.azanSound = false;
        await fireForegroundNotification();
        expect(playAzan).not.toHaveBeenCalled();
    });
});

describe('cancelAllNotifications', () => {
    it('cancels the service alarms too, not just the notifications', async () => {
        const svc = freshService();
        await svc.cancelAllNotifications();
        // Turning notifications off must silence the adhan as well, or the
        // service would still fire at prayer time with nothing on screen.
        expect(nativeCancelAll).toHaveBeenCalled();
        expect(cancelAllScheduled).toHaveBeenCalled();
    });
});

// ─── alarm horizon (v1.3.15) ─────────────────────────────────────────────────
//
// The defect: the app laid down 3 days of alerts and re-armed them only from
// applyLocation on the Home tab, so a user who did not open Azan Time for 3
// days silently stopped getting prayer alerts. Confirmed on a real device --
// `dumpsys alarm` showed 204 pending alarms system-wide and NOT ONE belonging
// to this app, the last having fired 2d15h earlier.
//
// The native re-arm layers (alarm chain, boot receiver, WorkManager) cannot be
// tested here; they need a device. What IS testable in JS, and what would rot
// silently if someone "tidied" the scheduling loop, is that the full horizon is
// computed, that the native side receives ALL of it rather than the notification
// window, and that the platform notification cap is respected.

describe('alarm horizon', () => {
    beforeEach(() => {
        savedLocation = { latitude: 21.4225, longitude: 39.8262 };
    });

    it('hands the native service far more than the old 3-day horizon', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const times: number[] = nativeSchedule.mock.calls[0][0] as any;
        // 3 days x 6 prayers was 18. Anything near that means the horizon
        // regressed to the old value.
        expect(times.length).toBeGreaterThan(100);

        const furthestDays = (Math.max(...times) - NOW) / 86400000;
        expect(furthestDays).toBeGreaterThan(25);
    });

    it('never gives the native side less than the notification schedule', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const times: number[] = nativeSchedule.mock.calls[0][0] as any;
        // On Android the notification budget (400) is never reached by a 30-day
        // horizon (~176), so these are legitimately EQUAL here — the cap only
        // bites on iOS, covered separately below. What must always hold is that
        // the native side is never the SHORTER of the two: an adhan without a
        // visible notification is worse than silence.
        expect(times.length).toBeGreaterThanOrEqual(scheduled.length);
    });

    it('keeps every scheduled instant paired with its own recording', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const [times, sounds] = nativeSchedule.mock.calls[0] as any;
        expect(sounds.length).toBe(times.length);
        // Fajr keeps its own recording across the whole horizon, not just day 1.
        expect(sounds).toContain('azan_fajr');
        expect(sounds).toContain('azan_mishary');
    });

    it('registers the WorkManager recovery layer', async () => {
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);
        expect(ensureRearmWorker).toHaveBeenCalled();
    });

    it('does not arm the worker when the service does not own playback', async () => {
        settings.azanShort = true;
        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);
        // Short azan stays on the sounded channel; there is no native schedule
        // to re-arm, so scheduling recovery work would be pointless wakeups.
        expect(ensureRearmWorker).not.toHaveBeenCalled();
        expect(nativeCancelAll).toHaveBeenCalled();
    });
});

describe('horizon telemetry — measuring a failure whose symptom is silence', () => {
    it('reports remaining cover BEFORE re-arming, including the ran-dry case', async () => {
        // furthestMs in the past = this install had already gone silent by the
        // time the user opened the app. That is the exact state observed on the
        // real device, and the number worth watching in the field.
        horizon = {
            persistedTotal: 180,
            futureCount: 0,
            armedCount: 0,
            furthestMs: NOW - 86400000,
            nextMs: 0,
        };
        savedLocation = { latitude: 21.4225, longitude: 39.8262 };

        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const { logEvent } = require('@/services/analyticsService');
        const call = logEvent.mock.calls.find((c: any[]) => c[0] === 'alarm_horizon_health');
        expect(call).toBeDefined();
        expect(call[1].ran_dry).toBe(true);
        expect(call[1].days_remaining).toBe(0);
    });

    it('uploads fire-time records captured while the app was closed', async () => {
        // Stamped natively at fire time and held until an app open -- the only
        // way to observe the users this bug affects, who by definition are not
        // opening the app.
        firedLog = [
            { t: NOW - 3 * 3600000, s: 'azan', e: 'started' },
            { t: NOW - 3 * 3600000, s: 'azan', e: 'played' },
        ];

        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const { logEvent } = require('@/services/analyticsService');
        const fired = logEvent.mock.calls.filter(
            (c: any[]) => c[0] === 'adhan_fired_batch',
        );
        // ONE aggregate event, not one per record: the ring holds up to 200 and
        // a month-absent user would otherwise emit 200 events on a single open.
        expect(fired).toHaveLength(1);
        expect(fired[0][1].started).toBe(1);
        expect(fired[0][1].played).toBe(1);
        expect(fired[0][1].unfinished).toBe(0);
        expect(fired[0][1].oldest_age_hours).toBe(3);
    });

    it('surfaces clipping as started-without-played', async () => {
        // A fire that began but never completed is how Doze or an OEM killer
        // shows up in the field — nobody reports "the adhan was short", they
        // just stop using the app.
        firedLog = [
            { t: NOW - 2 * 3600000, s: 'azan', e: 'started' },
            { t: NOW - 2 * 3600000, s: 'azan', e: 'played' },
            { t: NOW - 3600000, s: 'azan', e: 'started' },
        ];

        const svc = freshService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        const { logEvent } = require('@/services/analyticsService');
        const fired = logEvent.mock.calls.find(
            (c: any[]) => c[0] === 'adhan_fired_batch',
        );
        expect(fired[1].started).toBe(2);
        expect(fired[1].played).toBe(1);
        expect(fired[1].unfinished).toBe(1);
    });

    it('survives the native module being absent, without throwing', async () => {
        nativeModule = null;
        const svc = freshService();
        // iOS / Expo Go: no horizon info, no fired log, and scheduling must
        // still complete. Diagnostics must never cost a prayer alert.
        await expect(
            svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0),
        ).resolves.not.toThrow();
    });
});

describe('iOS pending-notification cap', () => {
    /**
     * iOS hard-caps pending local notifications at 64 and SILENTLY DROPS the
     * excess — no error, no warning. A 30-day horizon is ~176 notifications, so
     * without an explicit cap iOS would discard which alerts it kept on its own
     * terms. Capping deliberately means the cutoff is a decision we made.
     *
     * Needs its own module registry because Platform.OS is mocked for the whole
     * file, and the cap is read at module load.
     */
    function iosService() {
        let mod: any;
        jest.isolateModules(() => {
            jest.doMock('react-native', () => ({
                Platform: {
                    OS: 'ios',
                    select: (o: any) => (o && 'ios' in o ? o.ios : o?.default),
                },
            }));
            mod = require('@/services/notificationService');
        });
        return mod;
    }

    afterEach(() => {
        jest.dontMock('react-native');
    });

    it('stays under the 64-notification limit across a 30-day horizon', async () => {
        savedLocation = { latitude: 21.4225, longitude: 39.8262 };
        const svc = iosService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        // The Android run above schedules ~176 for the same horizon; if this
        // ever approaches that, the cap has been lost and iOS users silently
        // lose whichever alerts the OS decides to drop.
        expect(scheduled.length).toBeGreaterThan(0);
        expect(scheduled.length).toBeLessThanOrEqual(60);
    });

    it('does not route through the native service on iOS', async () => {
        savedLocation = { latitude: 21.4225, longitude: 39.8262 };
        const svc = iosService();
        await svc.schedulePrayerNotifications(prayers(), ALL_ENABLED, 0);

        // The service is Android-only, so iOS must keep the sounded-channel
        // path rather than scheduling silence it can never fill.
        expect(nativeSchedule).not.toHaveBeenCalled();
        expect(scheduled.every(s => s.sound !== false)).toBe(true);
    });
});
