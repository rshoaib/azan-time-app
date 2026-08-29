package expo.modules.adhanplayback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Fired by AlarmManager at prayer time. Its only job is to hand off to
 * [AdhanPlaybackService] fast.
 *
 * Background foreground-service starts are restricted on Android 12+, but an
 * app woken by an EXACT alarm gets a temporary allowlist to start one. This app
 * already holds USE_EXACT_ALARM (see plugins/withExactAlarmPermissions.js) and
 * the module schedules with setExactAndAllowWhileIdle, so that exemption
 * applies. If the start is ever refused anyway we log and give up rather than
 * crash — the (silent) prayer notification is still posted by expo-notifications
 * on its own alarm, so the user sees the prayer even if audio fails.
 */
class AdhanAlarmReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "AdhanAlarm"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val sound = intent.getStringExtra(AdhanPlaybackService.EXTRA_SOUND) ?: "azan"
    val title = intent.getStringExtra(AdhanPlaybackService.EXTRA_TITLE) ?: "Azan Time"
    val body = intent.getStringExtra(AdhanPlaybackService.EXTRA_BODY) ?: "Adhan is playing"

    val svc = Intent(context, AdhanPlaybackService::class.java).apply {
      action = AdhanPlaybackService.ACTION_PLAY
      putExtra(AdhanPlaybackService.EXTRA_SOUND, sound)
      putExtra(AdhanPlaybackService.EXTRA_TITLE, title)
      putExtra(AdhanPlaybackService.EXTRA_BODY, body)
    }

    try {
      ContextCompat.startForegroundService(context, svc)
      Log.i(TAG, "handed off to AdhanPlaybackService (raw/$sound)")
    } catch (e: Exception) {
      // e.g. ForegroundServiceStartNotAllowedException on a device that did not
      // grant the exact-alarm exemption. Prayer notification still shows.
      Log.e(TAG, "could not start AdhanPlaybackService", e)
    }

    // ─── THE ALARM CHAIN (v1.3.15) ───────────────────────────────────────────
    //
    // Slide the rolling armed window forward now that one alarm has been
    // consumed. This is the load-bearing re-arm layer: it runs ~6x a day, and
    // it rides the one mechanism Samsung's power management reliably honours —
    // an exact alarm firing is itself what wakes a sleeping app.
    //
    // OFF THE MAIN THREAD, and this is not theoretical. A BroadcastReceiver's
    // onReceive and a Service's onStartCommand both run on the app's MAIN
    // thread, so re-arming inline here does not merely run "after" the handoff
    // — it runs BEFORE the service can start, and delays the audio by exactly
    // its own duration. Measured on an SM-S938B with a 40-alarm window:
    //
    //   handed off .014  ->  chain re-armed .037  ->  adhan started .056
    //
    // i.e. ~23ms of the 46ms alarm-to-audio latency was this. Harmless at 40
    // alarms; it scales with the window, and the adhan firing promptly matters
    // more than the chain advancing promptly. goAsync() moves it to a
    // background thread and keeps the receiver alive while it finishes.
    //
    // A failure here must never cost the user their adhan — playback has
    // already been handed off, and the boot receiver or the worker will
    // recover the window.
    val pending = goAsync()
    Thread {
      try {
        val armed = AdhanScheduler.rearm(context)
        Log.i(TAG, "chain re-armed $armed upcoming alarms")
      } catch (e: Exception) {
        Log.e(TAG, "chain re-arm failed (worker/boot will recover)", e)
      } finally {
        // Must always run, or the receiver is never released.
        pending.finish()
      }
    }.start()
  }
}
