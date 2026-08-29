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

const nativeSchedule = jest.fn(() => 1);
const nativeCancelAll = jest.fn(() => true);
const ensureSilentChannel = jest.fn(() => true);

/** Swapped to null to simulate iOS / Expo Go / a build without the module. */
let nativeModule: any = {
    ensureSilentChannel,
    schedule: nativeSchedule,
    cancelAll: nativeCancelAll,
    playNow: jest.fn(),
    stop: jest.fn(),
    isPlaying: jest.fn(() => false),
};

jest.mock('@/modules/adhan-playback', () => ({
    __esModule: true,
    get default() {
        return nativeModule;
    },
    isAdhanServiceAvailable: () => nativeModule != null,
    addAdhanFinishedListener: jest.fn(() => () => {}),
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

jest.mock('@/services/storageService', () => ({
    getAzanSoundEnabled: jest.fn(async () => settings.azanSound),
    getAzanShortEnabled: jest.fn(async () => settings.azanShort),
    getAzanReciter: jest.fn(async () => settings.reciter),
    getCalculationMethod: jest.fn(async () => 'MuslimWorldLeague'),
    getMadhab: jest.fn(async () => 'shafi'),
    // No saved location -> schedulePrayerNotifications does not extend into the
    // next two days, so each test asserts on one clean day of prayers.
    getSavedLocation: jest.fn(async () => null),
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
    nativeModule = {
        ensureSilentChannel,
        schedule: nativeSchedule,
        cancelAll: nativeCancelAll,
        playNow: jest.fn(),
        stop: jest.fn(),
        isPlaying: jest.fn(() => false),
    };
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
