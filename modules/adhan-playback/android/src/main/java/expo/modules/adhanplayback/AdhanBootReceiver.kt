package expo.modules.adhanplayback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Re-arms the adhan alarms after a reboot.
 *
 * AlarmManager alarms are dropped on shutdown. expo-notifications restores its
 * own scheduled notifications on BOOT_COMPLETED, so without this the prayer
 * notification would return after a restart while the adhan stayed silent until
 * the user next opened the app — a worse failure than the truncation bug this
 * feature fixes.
 *
 * Also handles the Samsung/HTC quick-boot actions, which some OEMs send instead
 * of (or as well as) BOOT_COMPLETED, and MY_PACKAGE_REPLACED so an app update
 * does not leave the user without an adhan either.
 */
class AdhanBootReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "AdhanBoot"
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      "android.intent.action.QUICKBOOT_POWERON",
      "com.htc.intent.action.QUICKBOOT_POWERON" -> {
        // rearm() (not a fixed replay) so a reboot after several idle days arms
        // the next window from the persisted 30-day list, rather than restoring
        // a stale set whose entries are all in the past.
        val n = try {
          AdhanScheduler.rearm(context)
        } catch (e: Exception) {
          Log.e(TAG, "re-arm after ${intent.action} failed", e); 0
        }
        Log.i(TAG, "re-armed $n adhan alarms after ${intent.action}")

        // WorkManager re-registers its own persisted work across reboots, but
        // enqueueing with KEEP here costs nothing and covers the case where its
        // records were lost (cleared data, some OEM cleaners).
        try {
          AdhanRearmWorker.ensureScheduled(context)
        } catch (e: Exception) {
          Log.w(TAG, "could not ensure re-arm worker", e)
        }
      }
      else -> Log.i(TAG, "ignoring ${intent.action}")
    }
  }
}
