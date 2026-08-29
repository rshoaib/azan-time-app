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
 * Owns the adhan alarm set: arming, cancelling, and persisting it.
 *
 * Persistence exists because alarms do NOT survive a reboot. expo-notifications
 * re-arms its own scheduled notifications from native storage on BOOT_COMPLETED;
 * if we did not do the same, the visible prayer notification would come back
 * after a restart but the adhan would silently stop until the user next opened
 * the app. That is a worse regression than the bug being fixed, so the schedule
 * is written to SharedPreferences and replayed by AdhanBootReceiver.
 */
object AdhanScheduler {

  private const val TAG = "AdhanScheduler"
  private const val PREFS = "adhan_playback"
  private const val KEY_SCHEDULE = "schedule_json"

  private const val REQUEST_BASE = 0x4100
  /** Upper bound on alarms held at once, so cancelAll can be exhaustive. */
  const val MAX_ALARMS = 64

  /**
   * Arm exact alarms for every future entry and persist the set.
   * Returns how many were actually armed.
   */
  fun schedule(
    context: Context,
    times: List<Long>,
    sounds: List<String>,
    title: String,
    body: String,
    persist: Boolean = true,
  ): Int {
    cancelAll(context, clearPersisted = false)

    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val now = System.currentTimeMillis()
    var count = 0

    times.forEachIndexed { i, at ->
      if (i >= MAX_ALARMS) return@forEachIndexed
      if (at <= now) return@forEachIndexed
      val sound = sounds.getOrElse(i) { "azan" }
      val pi = alarmIntent(context, i, sound, title, body)

      val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        am.canScheduleExactAlarms()
      } else true

      try {
        if (canExact) {
          // AllowWhileIdle is what lets this fire in Doze, and is also what grants
          // the receiver its short foreground-service start exemption.
          am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
          Log.w(TAG, "exact alarms unavailable — falling back to inexact")
          am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
        count++
      } catch (e: Exception) {
        Log.e(TAG, "failed to arm alarm $i", e)
      }
    }

    if (persist) persist(context, times, sounds, title, body)
    Log.i(TAG, "armed $count adhan alarms")
    return count
  }

  fun cancelAll(context: Context, clearPersisted: Boolean = true) {
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
    if (clearPersisted) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().remove(KEY_SCHEDULE).apply()
    }
  }

  /** Re-arm whatever was persisted, dropping entries now in the past. */
  fun restore(context: Context): Int {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_SCHEDULE, null) ?: return 0
    return try {
      val o = JSONObject(raw)
      val ta = o.getJSONArray("times")
      val sa = o.getJSONArray("sounds")
      val times = ArrayList<Long>(ta.length())
      val sounds = ArrayList<String>(sa.length())
      for (i in 0 until ta.length()) times.add(ta.getLong(i))
      for (i in 0 until sa.length()) sounds.add(sa.getString(i))
      // persist=false: replaying the same set, no need to rewrite it.
      schedule(context, times, sounds, o.optString("title", "Azan Time"),
        o.optString("body", "Adhan is playing"), persist = false)
    } catch (e: Exception) {
      Log.e(TAG, "could not restore persisted schedule", e)
      0
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
    index: Int,
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
      REQUEST_BASE + index,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }
}
