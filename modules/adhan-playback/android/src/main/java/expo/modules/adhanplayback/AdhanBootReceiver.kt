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
        val n = AdhanScheduler.restore(context)
        Log.i(TAG, "restored $n adhan alarms after ${intent.action}")
      }
      else -> Log.i(TAG, "ignoring ${intent.action}")
    }
  }
}
