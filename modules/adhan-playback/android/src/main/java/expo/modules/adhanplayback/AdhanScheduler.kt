package expo.modules.adhanplayback

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Owns the adhan alarm set: arming, cancelling, persisting and RE-ARMING it.
 *
 * ─── THE HORIZON PROBLEM ─────────────────────────────────────────────────────
 *
 * Before v1.3.15 the app laid down three days of prayer alarms and re-armed
 * them only from `applyLocation` on the Home tab — i.e. only when the user
 * opened the app. A user who did not open Azan Time for three days simply
 * stopped receiving prayer alerts. Nothing crashed and nothing logged; the
 * settings screen still said reminders were on.
 *
 * That was not theory. `dumpsys alarm` on a real device (SM-S938B, 2026-08-29)
 * showed 204 pending alarms system-wide and NOT ONE belonging to this app —
 * the last had fired 2d15h earlier. An exhausted horizon, not a short one.
 *
 * ─── THE SHAPE OF THE FIX ────────────────────────────────────────────────────
 *
 * Prayer times are computed in JS by the `adhan` library. Porting that maths to
 * Kotlin so a background worker could recompute it would duplicate the
 * calculation and guarantee eventual drift between the two implementations.
 * Running headless JS from a worker is fragile and itself throttled.
 *
 * So the native side is deliberately DUMB: JS computes a long list of prayer
 * instants once (30 days) and hands the whole thing over; this object persists
 * it and merely REPLAYS it. No prayer maths lives here, and there is exactly
 * one source of truth for when a prayer is.
 *
 * AlarmManager cannot hold 180 pending alarms comfortably, so the persisted
 * list is long but only a rolling WINDOW of [ARMED_WINDOW] alarms is armed at
 * any moment. Three things slide that window forward, none of which needs the
 * app to be opened:
 *
 *   1. AdhanAlarmReceiver  — every alarm that fires re-arms the next. This is
 *      the LOAD-BEARING layer: it self-heals ~6x a day, and an exact alarm is
 *      the mechanism Samsung's power management interferes with least (it is
 *      what wakes a sleeping app in the first place).
 *   2. AdhanBootReceiver   — reboots and app updates, which drop all alarms.
 *   3. AdhanRearmWorker    — a periodic WorkManager job, purely a RECOVERY path
 *      for when the chain above is broken all at once. Assume Samsung will
 *      throttle or sleep it; correctness must not depend on it.
 *
 * KNOWN LIMIT, stated rather than papered over: a user who force-stops the app
 * from the task manager loses alarms, the chain and the worker together, until
 * they next open it. Nothing here can fix that.
 *
 * SECOND KNOWN LIMIT: this moves the cliff from 3 days to 30, it does not
 * remove it. Beyond the persisted list the app still needs one launch to
 * refill. Removing the cliff entirely means computing prayer times natively,
 * which is the trade rejected above.
 */
object AdhanScheduler {

  private const val TAG = "AdhanScheduler"
  private const val PREFS = "adhan_playback"
  private const val KEY_SCHEDULE = "schedule_json"
  private const val KEY_FIRED_LOG = "fired_log_json"
  private const val KEY_LAST_ARMED = "last_armed_count"
  private const val KEY_LAST_ARMED_AT = "last_armed_at"

  private const val REQUEST_BASE = 0x4100

  /**
   * How many alarms are armed with AlarmManager at once. The persisted list is
   * far longer (~180 entries for 30 days); this is the rolling window over it.
   * 40 is ~6.7 days of cover at 6 prayers/day, which is deep enough that the
   * worker and the chain both have many chances to slide it before it lapses,
   * and shallow enough to sit well inside the device's per-uid alarm cap
   * (observed: max_alarms_per_uid=500).
   */
  const val ARMED_WINDOW = 40

  /** Upper bound on request codes ever used, so cancelAll can be exhaustive. */
  const val MAX_ALARMS = 64

  /**
   * Bounded ring of "the adhan actually fired" records. See [recordFired].
   * 200 entries is ~33 days at 6 prayers/day — comfortably longer than the
   * schedule horizon, so a user who opens the app monthly still brings back a
   * complete picture.
   */
  private const val FIRED_LOG_MAX = 200

  /**
   * Accept a new schedule from JS: persist all of it, arm the first window.
   * Returns how many alarms were actually armed (not how many were stored).
   */
  fun schedule(
    context: Context,
    times: List<Long>,
    sounds: List<String>,
    title: String,
    body: String,
  ): Int {
    persist(context, times, sounds, title, body)
    return rearm(context)
  }

  /**
   * Re-arm the next [ARMED_WINDOW] future alarms from the persisted list.
   *
   * This is the single entry point for all three re-arm paths, so the chain,
   * the boot receiver and the worker cannot drift apart in behaviour. Safe to
   * call redundantly: it cancels and re-arms, and PendingIntent request codes
   * are window POSITIONS (not list indices), so repeated calls replace rather
   * than accumulate.
   */
  fun rearm(context: Context): Int {
    val s = readPersisted(context) ?: return 0

    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val now = System.currentTimeMillis()

    // Keep pairing intact while filtering: sounds[i] belongs to times[i].
    val upcoming = s.times.indices
      .filter { s.times[it] > now }
      .sortedBy { s.times[it] }
      .take(ARMED_WINDOW)

    cancelAlarmsOnly(context)

    var count = 0
    upcoming.forEachIndexed { position, i ->
      val at = s.times[i]
      val sound = s.sounds.getOrElse(i) { "azan" }
      val pi = alarmIntent(context, position, sound, s.title, s.body)

      val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        am.canScheduleExactAlarms()
      } else true

      try {
        if (canExact) {
          // AllowWhileIdle is what lets this fire in Doze, and is also what
          // grants the receiver its short foreground-service start exemption.
          am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
          Log.w(TAG, "exact alarms unavailable — falling back to inexact")
          am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
        count++
      } catch (e: Exception) {
        Log.e(TAG, "failed to arm alarm at position $position", e)
      }
    }

    // Record what was ACTUALLY armed, not what we intended to arm. horizonInfo
    // reports this rather than recomputing it, so a partial failure (an
    // AlarmManager throw, an OEM cap) shows up in the health metric instead of
    // being hidden behind an optimistic calculation. The metric exists to catch
    // silent failure; it must not be capable of lying in the reassuring
    // direction.
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putInt(KEY_LAST_ARMED, count)
      .putLong(KEY_LAST_ARMED_AT, System.currentTimeMillis())
      .apply()

    Log.i(TAG, "armed $count of ${s.times.size} persisted adhan alarms")
    return count
  }

  fun cancelAll(context: Context) {
    cancelAlarmsOnly(context)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit().remove(KEY_SCHEDULE).apply()
  }

  private fun cancelAlarmsOnly(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (i in 0 until MAX_ALARMS) {
      // FLAG_NO_CREATE: non-null only if this alarm actually exists.
      val existing = PendingIntent.getBroadcast(
        context,
        REQUEST_BASE + i,
        Intent(context, AdhanAlarmReceiver::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
      )
      if (existing != null) {
        am.cancel(existing)
        existing.cancel()
      }
    }
  }

  // ─── Horizon health ────────────────────────────────────────────────────────

  /**
   * A snapshot of how much cover is actually left, for the JS side to report.
   *
   * This is the metric that makes a SILENT failure visible: read on app open
   * BEFORE re-arming, `furthestArmedMs` says how close this install came to
   * running dry. In aggregate, a population clustering near the full horizon
   * means the mechanism works; a mass of zeroes means it does not.
   */
  fun horizonInfo(context: Context): Map<String, Any> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val s = readPersisted(context)
    val now = System.currentTimeMillis()
    val futures = s?.times?.filter { it > now }?.sorted() ?: emptyList()
    return mapOf(
      "persistedTotal" to (s?.times?.size ?: 0),
      "futureCount" to futures.size,
      // Observed, not computed — see the note in rearm().
      "armedCount" to prefs.getInt(KEY_LAST_ARMED, 0),
      // How long ago anything last re-armed. A value far older than the worker
      // interval means the chain AND the worker have both stopped running,
      // which is the failure this whole mechanism exists to prevent.
      "lastArmedAtMs" to prefs.getLong(KEY_LAST_ARMED_AT, 0L),
      "furthestMs" to (futures.lastOrNull() ?: 0L),
      "nextMs" to (futures.firstOrNull() ?: 0L),
    )
  }

  // ─── Fire-time telemetry ───────────────────────────────────────────────────

  /**
   * Record that an adhan actually fired, for JS to upload on next app open.
   *
   * WHY AT FIRE TIME: the failure being guarded against is silence, and the
   * users it affects are precisely those who do not open the app — the ones
   * ordinary open-time telemetry cannot see. Stamping the event when it happens
   * and uploading it later means one app open per month still returns a full
   * month of "did it actually fire" history, with original timestamps.
   *
   * CONSTRAINTS, deliberately strict — the adhan firing matters more than
   * knowing that it did:
   *   - No network on the alarm path. SharedPreferences only.
   *   - Bounded: a ring of [FIRED_LOG_MAX], oldest dropped.
   *   - Never blocks or delays playback: called AFTER MediaPlayer.start(), and
   *     every failure is swallowed. Writes use apply(), which is async.
   */
  fun recordFired(context: Context, sound: String, event: String) {
    try {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val arr = try {
        JSONArray(prefs.getString(KEY_FIRED_LOG, "[]") ?: "[]")
      } catch (e: Exception) {
        JSONArray()
      }

      arr.put(JSONObject().apply {
        put("t", System.currentTimeMillis())
        put("s", sound)
        put("e", event)
      })

      // Ring: keep only the newest FIRED_LOG_MAX entries.
      val trimmed = if (arr.length() > FIRED_LOG_MAX) {
        JSONArray().also { out ->
          for (i in (arr.length() - FIRED_LOG_MAX) until arr.length()) out.put(arr.get(i))
        }
      } else arr

      prefs.edit().putString(KEY_FIRED_LOG, trimmed.toString()).apply()
    } catch (e: Exception) {
      // Telemetry must never be a reason the adhan misbehaves.
      Log.w(TAG, "could not record fired event (ignored)", e)
    }
  }

  /** Hand the fired log to JS and clear it. Returns the raw JSON array string. */
  fun drainFiredLog(context: Context): String {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_FIRED_LOG, "[]") ?: "[]"
    prefs.edit().remove(KEY_FIRED_LOG).apply()
    return raw
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  private class Persisted(
    val times: List<Long>,
    val sounds: List<String>,
    val title: String,
    val body: String,
  )

  private fun readPersisted(context: Context): Persisted? {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_SCHEDULE, null) ?: return null
    return try {
      val o = JSONObject(raw)
      val ta = o.getJSONArray("times")
      val sa = o.getJSONArray("sounds")
      val times = ArrayList<Long>(ta.length())
      val sounds = ArrayList<String>(sa.length())
      for (i in 0 until ta.length()) times.add(ta.getLong(i))
      for (i in 0 until sa.length()) sounds.add(sa.getString(i))
      Persisted(times, sounds, o.optString("title", "Azan Time"),
        o.optString("body", "Adhan is playing"))
    } catch (e: Exception) {
      Log.e(TAG, "could not read persisted schedule", e)
      null
    }
  }

  private fun persist(
    context: Context,
    times: List<Long>,
    sounds: List<String>,
    title: String,
    body: String,
  ) {
    try {
      val o = JSONObject().apply {
        put("times", JSONArray().also { a -> times.forEach { a.put(it) } })
        put("sounds", JSONArray().also { a -> sounds.forEach { a.put(it) } })
        put("title", title)
        put("body", body)
      }
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putString(KEY_SCHEDULE, o.toString()).apply()
    } catch (e: Exception) {
      Log.e(TAG, "could not persist schedule", e)
    }
  }

  private fun alarmIntent(
    context: Context,
    position: Int,
    sound: String,
    title: String,
    body: String,
  ): PendingIntent {
    val intent = Intent(context, AdhanAlarmReceiver::class.java).apply {
      putExtra(AdhanPlaybackService.EXTRA_SOUND, sound)
      putExtra(AdhanPlaybackService.EXTRA_TITLE, title)
      putExtra(AdhanPlaybackService.EXTRA_BODY, body)
    }
    return PendingIntent.getBroadcast(
      context,
      REQUEST_BASE + position,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }
}
