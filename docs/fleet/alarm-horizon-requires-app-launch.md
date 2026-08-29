# Fleet check — scheduled reminders that silently stop without an app launch

**Status:** Azan Time — **FIXED and shipped in v1.3.15 / vc42** (2026-08-29).
Backtime — **open, not started.**
Fasting Buddy — checked, not affected.
**Origin:** the Azan Time alarm-horizon investigation, 2026-08-29.

## The failure mode

`expo-notifications` schedules one-shot local notifications against a fixed
future instant. There is no such thing as an infinite schedule: an app lays down
N pending notifications covering some *horizon*, and when that horizon is
exhausted **the app goes silent**.

That is fine only if something re-arms the schedule. In practice the re-arm is
wired to a screen mount or an AppState `active` transition — i.e. **it requires
the user to open the app.** So the contract quietly becomes:

> reminders keep working for as long as the horizon, and then stop until the
> user next launches the app.

**This is invisible in every direction.** Nothing crashes. Nothing logs. The
notification permission stays granted and the settings screen still says
reminders are on. The user does not get a broken alert — they get *no alert*,
which is indistinguishable from "no prayer is due" until they notice they missed
something. And an app whose whole promise is "you don't need to open this" is
exactly the app where nobody opens it for days.

Crucially, on Android this is usually **not** a platform constraint. iOS caps
pending notifications at 64; Android's AlarmManager has no comparable limit. A
3-day horizon at 6 alerts/day is 18 notifications — nowhere near any cap. Check
whether the horizon is a real limit before assuming it is.

## Azan Time — confirmed

- Horizon: **3 days** (`services/notificationService.ts`, `dayOffset 1..2` plus
  today). 6 prayers × 3 days = 18 notifications.
- Call sites of `schedulePrayerNotifications`: **exactly one** —
  `app/(tabs)/index.tsx:82`, inside `applyLocation`, on the Home tab load.
- No background rescheduling of any kind.

**So a user who does not open Azan Time for 3 days stops receiving prayer
alerts.** Rizwan's own device showed the last alarm fired 2 days prior with 17
wakeups lifetime.

The 3-day horizon was not a considered decision: it was introduced in `07f9dce`,
a large unrelated commit ("version mismatch, tasbih contrast, weekly comparison
method bug"), with no rationale and no comment. It is a mistake, not a
workaround.

This may explain the install decline (2,497 → 1,903 active installs, June →
August 2026) better than the "fading acquisition spike" theory, which was the
working assumption before this was found.

## Backtime — REAL DEFECT, low exposure, do not forget

Same shape, in `src/services/alarmEngine.ts`:

- Horizon: `OCCURRENCES_AHEAD = 5` (`src/constants/index.ts`) — five
  *occurrences*, not five days.
- `armPreset` re-arms on every foreground (`src/app/_layout.tsx:69`, AppState
  `active`), plus on notification-tap paths.

The exposure is much lower than Azan's, because Backtime is an alarm clock: the
user dismisses the alarm each morning, which foregrounds the app and re-arms it.

**That reasoning is only true right up until someone doesn't.** A weekend away, a
phone left off, a fortnight of not using the routine, a preset armed for weekdays
only — any of those can exhaust five occurrences with no launch, and then the
alarm silently does not go off. For an app whose single job is waking someone up,
the consequence of the silent case is worse than Azan's even though it is rarer.

Deliberately **not** fixed alongside Azan v1.3.15 to keep that change reviewable
and revertable. It should inherit whatever mechanism Azan lands.

## Fasting Buddy — checked, NOT affected

`services/notificationService.ts` has no horizon to exhaust:

- Hydration reminder uses `SchedulableTriggerInputTypes.DAILY`, a
  self-repeating OS-level trigger — it re-arms itself with no app involvement.
- Fast-end uses a one-shot `TIME_INTERVAL` tied to a fast the user started, so
  it is inherently event-driven and cannot outlive its own trigger.

Use `DAILY` wherever the reminder genuinely is daily — it sidesteps this entire
class of bug.

## The check, per app

For each app that schedules local notifications:

1. Find every `scheduleNotificationAsync` call. If the trigger type is `DAILY`
   (or another repeating type), that path is safe — skip it.
2. For `DATE` / `TIME_INTERVAL` one-shots, find the **horizon**: how many
   notifications are laid down, covering how long.
3. Find every **call site** of the scheduling function. If they are all mounts,
   focus effects, or AppState transitions, the app has this defect.
4. Ask whether the horizon is a platform limit or an arbitrary number. Check the
   commit that introduced it. On Android it is usually arbitrary.

## Prevention

Widening the horizon does not fix this, it only moves the cliff. The fix is
**re-arming without requiring a launch**:

- A `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED` receiver (covers reboots and app
  updates, not the passage of time).
- A periodic **WorkManager** job that tops the schedule up. Note `androidx.work`
  is already on the classpath transitively in these apps — check the merged
  manifest for `androidx.work.impl.background.systemalarm.RescheduleReceiver`
  before adding a dependency.
- A self-perpetuating chain (each firing alarm schedules the next). Cheap, but it
  breaks permanently if ever interrupted, so it needs a companion mechanism —
  never ship it alone.

Whatever is chosen, it needs a way to **observe** that it is working, because the
failure mode is silence. See Azan's v1.3.15 verification notes.

---

## Azan Time — what shipped (v1.3.15, 2026-08-29) and what is still unknown

**Shipped:** 30-day persisted schedule with a rolling ~8-day armed window,
re-armed by three layers that need no app launch — the alarm chain (each
firing alarm arms the next), the boot receiver, and a 12h WorkManager job.
The notification horizon widened to match (30 days on Android, capped at 60
pending on iOS because iOS hard-caps at 64 and silently drops the excess).

### Verified on hardware (SM-S938B)

- Backgrounded fire: `uidState: RCVR`, `allowWiu:-1`,
  `code:ALARM_MANAGER_WHILE_IDLE` — the FGS start is granted by the
  exact-alarm exemption alone, with no foreground privilege.
- Forced deep Doze, never on the battery-optimisation whitelist, forced back
  into idle mid-playback: **0 ms clipping**, full 197.6s every time.
- Reboot with the app never reopened: 40 `AdhanAlarmReceiver` alarms restored
  from the persisted list. NOTE: count the app's OWN receiver, not the total
  pending — expo-notifications restores its own alarms on boot and will
  satisfy a total-count check even if your boot receiver never ran.

### KNOWN UNKNOWN — Samsung "sleeping apps"

**This was NOT verified and cannot be, in a single session.**

Samsung's App Power Management ("sleeping apps" / "deep sleeping apps") is
separate from AOSP standby buckets and does not show up in
`am get-standby-bucket`. It manifests only after **days** of an app going
unused — precisely the condition the horizon fix exists to survive, and
precisely the condition a test session cannot compress.

Nothing interfered during testing. That is absence of evidence, not evidence
of absence. Do not read the passing device tests as clearance on this point.

It is the reason the design puts the **alarm chain** in the load-bearing role
and demotes WorkManager to recovery: an exact alarm firing is the mechanism
OEM power management honours most reliably (it is what wakes a sleeping app
in the first place), whereas a periodic job is the first thing to be
throttled. If Samsung kills the worker entirely, the design still holds.

The way this gets answered is the field telemetry, not another test session:
`alarm_horizon_health.hours_since_rearm` routinely far above 12h means the
background layers are not running on real devices.

### Other limits, stated rather than buried

- The cliff moved from 3 days to 30; it was not removed. Beyond the persisted
  list the app still needs one launch.
- A force-stop from the task manager kills alarms, chain and worker together
  until next launch. Nothing in this design fixes that.
