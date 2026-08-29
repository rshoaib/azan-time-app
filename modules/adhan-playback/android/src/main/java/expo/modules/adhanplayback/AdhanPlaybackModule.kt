package expo.modules.adhanplayback

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge for the adhan foreground service.
 *
 * Responsibilities, deliberately narrow:
 *   1. `ensureSilentChannel` — create the notification channel the app schedules
 *      prayer alerts on, with setSound(null, null). This is what makes the
 *      double-adhan of a8859a7 structurally impossible: there is no channel
 *      sound in existence, so nothing can race the service.
 *   2. `schedule` / `cancelAll` — delegate to AdhanScheduler, which also
 *      persists the set so AdhanBootReceiver can replay it after a reboot.
 *   3. `playNow` / `stop` / `isPlaying` — direct control, used by the in-app
 *      Stop button and by manual verification.
 */
class AdhanPlaybackModule : Module() {

  companion object {
    private const val TAG = "AdhanPlaybackModule"
  }

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No react context")

  override fun definition() = ModuleDefinition {
    Name("AdhanPlayback")

    // Emitted when an adhan plays through to its natural end. JS uses this to
    // fire the frequency-capped interstitial, preserving the "azan finished"
    // trigger now that playback lives in the service rather than expo-audio.
    Events("onAdhanFinished")

    OnStartObserving {
      AdhanPlaybackService.onFinishedNaturally = {
        try {
          sendEvent("onAdhanFinished", mapOf<String, Any?>())
        } catch (e: Exception) {
          Log.w(TAG, "failed to emit onAdhanFinished", e)
        }
      }
    }

    OnStopObserving {
      AdhanPlaybackService.onFinishedNaturally = null
    }

    /**
     * Create (or no-op if it exists) a notification channel guaranteed to be
     * silent. Channel settings are IMMUTABLE after creation, so callers must
     * pass a NEW id whenever the sound semantics change — that is why the JS
     * side uses a `-v3` id rather than reusing the sounded reciter channels.
     */
    Function("ensureSilentChannel") { id: String, name: String, description: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val ch = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
          this.description = description
          setSound(null, null)          // <- the structural guarantee
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 250, 250, 250)
        }
        nm.createNotificationChannel(ch)
      }
      true
    }

    /**
     * Schedule exact alarms. `times` are epoch milliseconds; `sounds[i]` is the
     * res/raw name to play for `times[i]` (Fajr differs from the rest).
     * Replaces any previously scheduled set.
     */
    Function("schedule") { times: List<Double>, sounds: List<String>, title: String, body: String ->
      AdhanScheduler.schedule(
        context,
        times.map { it.toLong() },
        sounds,
        title,
        body,
      )
    }

    Function("cancelAll") {
      AdhanScheduler.cancelAll(context)
      true
    }

    /** Play immediately — in-app preview and manual verification. */
    Function("playNow") { sound: String, title: String, body: String ->
      val svc = Intent(context, AdhanPlaybackService::class.java).apply {
        action = AdhanPlaybackService.ACTION_PLAY
        putExtra(AdhanPlaybackService.EXTRA_SOUND, sound)
        putExtra(AdhanPlaybackService.EXTRA_TITLE, title)
        putExtra(AdhanPlaybackService.EXTRA_BODY, body)
      }
      // ContextCompat handles the pre-O path where startForegroundService does
      // not exist (minSdk is 24).
      ContextCompat.startForegroundService(context, svc)
      true
    }

    Function("stop") {
      val svc = Intent(context, AdhanPlaybackService::class.java)
        .setAction(AdhanPlaybackService.ACTION_STOP)
      try {
        context.startService(svc)
      } catch (e: Exception) {
        // Not running, or background-start restricted — nothing to stop.
        Log.w(TAG, "stop: service not running", e)
      }
      true
    }

    Function("isPlaying") { AdhanPlaybackService.isPlaying }
  }
}
