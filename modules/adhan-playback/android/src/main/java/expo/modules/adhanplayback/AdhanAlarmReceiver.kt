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
  }
}
