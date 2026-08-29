package expo.modules.adhanplayback

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log

/**
 * Plays the full adhan as a foreground service.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before v1.3.14 the adhan was bound to the notification CHANNEL sound. Android
 * hands channel sounds to the system notification player with
 * `usage=USAGE_NOTIFICATION, content=CONTENT_TYPE_SONIFICATION` — a sonification
 * path built for short chimes, not for a 2-3 minute recording. Users heard a
 * truncated fragment and reported it as "the short azan", even though the full
 * 197s file was bundled, shipped and selected. Foreground playback (expo-audio)
 * was correct, but it only runs when the app is already open — which is almost
 * never true at prayer time.
 *
 * This service plays the same bundled res/raw recording through a MediaPlayer
 * with `USAGE_ALARM`, which is not truncated, is audible over the lock screen,
 * and rides the alarm volume stream like every other prayer/alarm app.
 *
 * DOUBLE-PLAYBACK SAFETY
 * ----------------------
 * Commit a8859a7 fixed a double-adhan bug once already (OS channel sound and
 * expo-av playing at the same time). We do not want to re-litigate that by
 * relying on call ordering. Instead it is made STRUCTURALLY impossible:
 * the notification channels this app schedules on are created with
 * `setSound(null, null)` (see AdhanPlaybackModule.ensureSilentChannel) so there
 * is no channel sound in existence to collide with. The only component that can
 * emit adhan audio in the background is this service, and `isPlaying` below
 * guarantees at most one MediaPlayer at a time.
 */
class AdhanPlaybackService : Service() {

  companion object {
    const val EXTRA_SOUND = "sound"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val ACTION_PLAY = "expo.modules.adhanplayback.PLAY"
    const val ACTION_STOP = "expo.modules.adhanplayback.STOP"

    /** Channel for the service's own persistent "playing" notification. Silent. */
    const val FGS_CHANNEL_ID = "adhan-playback-fgs"
    private const val NOTIFICATION_ID = 0x4144 // 'AD'
    private const val TAG = "AdhanPlayback"

    /** Guards against a second alarm stacking a second MediaPlayer. */
    @Volatile
    var isPlaying: Boolean = false
      private set

    /**
     * Invoked when an adhan finishes NATURALLY (not when stopped by the user or
     * by an error). AdhanPlaybackModule installs this so JS can keep firing the
     * frequency-capped interstitial on azan completion — the same "genuine
     * completion moment" trigger the ad service already used, preserved now that
     * playback moved out of expo-audio. Same process, so a plain callback is
     * enough; it is cleared if the module goes away.
     */
    @Volatile
    var onFinishedNaturally: (() -> Unit)? = null
  }

  private var player: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var focusRequest: AudioFocusRequest? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopEverything()
      return START_NOT_STICKY
    }

    val soundName = intent?.getStringExtra(EXTRA_SOUND) ?: "azan"
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Azan Time"
    val body = intent?.getStringExtra(EXTRA_BODY) ?: "Adhan is playing"

    // Promote to foreground FIRST. Android 12+ gives an exact alarm only a short
    // window to call startForeground(); missing it kills the process with a
    // ForegroundServiceDidNotStartInTimeException.
    startForegroundCompat(title, body)

    // A second alarm arriving mid-adhan must not stack a second player.
    if (isPlaying) {
      Log.i(TAG, "adhan already playing — ignoring duplicate start")
      return START_NOT_STICKY
    }

    play(soundName)
    return START_NOT_STICKY
  }

  private fun startForegroundCompat(title: String, body: String) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // IMPORTANCE_LOW: visible and persistent, but the channel itself makes no
      // sound. The service is the only thing producing audio.
      val ch = NotificationChannel(
        FGS_CHANNEL_ID,
        "Adhan playback",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Shown while the adhan is playing"
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      }
      nm.createNotificationChannel(ch)
    }

    val stopIntent = PendingIntent.getService(
      this,
      1,
      Intent(this, AdhanPlaybackService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val launch = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(
        this, 2, it,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, FGS_CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    val icon = applicationInfo.icon
    val notification = builder
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(icon)
      .setOngoing(true)
      .setContentIntent(launch)
      // Action.Builder(Icon?, ...) only accepts a null icon from API 23; below
      // that the deprecated (int, ...) overload is the safe path.
      .addAction(
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          Notification.Action.Builder(null as android.graphics.drawable.Icon?, "Stop", stopIntent).build()
        } else {
          @Suppress("DEPRECATION")
          Notification.Action.Builder(icon, "Stop", stopIntent).build()
        }
      )
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  /**
   * Resolve a bundled recording, tolerating resource shrinking.
   *
   * The same audio is bundled TWICE under two resource names:
   *   - `raw/azan`               — placed by the expo-notifications config
   *                                plugin from app.json's `sounds` array.
   *   - `raw/assets_audio_azan`  — placed by Metro from assets/audio/.
   *
   * We prefer the first. But the React Native gradle plugin generates the
   * app's res/raw/keep.xml, and its keep list covers only the `assets_audio_*`
   * names — so turning on `shrinkResources` would strip `raw/azan` and leave
   * this service unable to find anything to play. A library cannot contribute
   * to that generated keep.xml (an app-level `raw/keep` silently overrides a
   * library's), so instead of depending on a keep rule nobody will remember,
   * we fall back to the name that is already protected.
   *
   * Net effect: R8 can be enabled on this app without touching this module.
   */
  private fun resolveSound(soundName: String): Int {
    resources.getIdentifier(soundName, "raw", packageName)
      .let { if (it != 0) return it }

    val fallback = "assets_audio_$soundName"
    val id = resources.getIdentifier(fallback, "raw", packageName)
    if (id != 0) {
      Log.w(TAG, "raw/$soundName missing — using raw/$fallback (resource shrinking?)")
    }
    return id
  }

  private fun play(soundName: String) {
    val resId = resolveSound(soundName)
    if (resId == 0) {
      Log.e(TAG, "raw/$soundName not found — refusing to play")
      stopEverything()
      return
    }

    // Doze can suspend the CPU mid-playback. MediaPlayer's own
    // setWakeMode needs WAKE_LOCK anyway, and an explicit partial lock keeps the
    // tail of a 3-minute recording from being clipped.
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$TAG::playback").apply {
      setReferenceCounted(false)
      acquire(5 * 60 * 1000L) // hard ceiling: longest adhan is ~224s
    }

    val attrs = AudioAttributes.Builder()
      // USAGE_ALARM, not USAGE_NOTIFICATION — this is the whole point of the fix.
      // Alarm usage is not truncated by the notification player, plays on the
      // alarm stream, and is audible over the lock screen.
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(attrs)
        .build()
        .also { am.requestAudioFocus(it) }
    }

    try {
      player = MediaPlayer().apply {
        setAudioAttributes(attrs)
        setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
        val afd = resources.openRawResourceFd(resId) ?: run {
          Log.e(TAG, "could not open raw/$soundName")
          stopEverything()
          return
        }
        afd.use { setDataSource(it.fileDescriptor, it.startOffset, it.length) }
        setOnCompletionListener {
          Log.i(TAG, "adhan finished normally")
          // Notify BEFORE teardown so JS sees the completion even if the
          // service is destroyed immediately after.
          try {
            onFinishedNaturally?.invoke()
          } catch (e: Exception) {
            Log.w(TAG, "onFinishedNaturally threw", e)
          }
          stopEverything()
        }
        setOnErrorListener { _, what, extra ->
          Log.e(TAG, "MediaPlayer error what=$what extra=$extra")
          stopEverything()
          true
        }
        prepare()
        start()
      }
      isPlaying = true
      Log.i(TAG, "adhan started: raw/$soundName")
    } catch (e: Exception) {
      Log.e(TAG, "failed to start adhan", e)
      stopEverything()
    }
  }

  private fun stopEverything() {
    isPlaying = false
    try {
      player?.let { if (it.isPlaying) it.stop(); it.release() }
    } catch (e: Exception) {
      Log.w(TAG, "error releasing player", e)
    }
    player = null

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let {
        (getSystemService(Context.AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it)
      }
    }
    focusRequest = null

    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null

    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    stopEverything()
    super.onDestroy()
  }
}
