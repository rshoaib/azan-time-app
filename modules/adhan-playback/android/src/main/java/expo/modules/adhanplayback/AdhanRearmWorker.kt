package expo.modules.adhanplayback

import android.content.Context
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * RECOVERY layer for the adhan alarm window. Explicitly not the primary one.
 *
 * WHY IT IS NOT PRIMARY
 * ---------------------
 * Samsung's "Deep sleeping apps" / App Power Management will put an unused app
 * to sleep and its WorkManager jobs simply stop running. That list is separate
 * from AOSP standby buckets, so a healthy-looking bucket reading says nothing
 * about it — the device this was built against read WORKING_SET after days of
 * disuse while having zero alarms armed. The honest assumption is that this
 * worker will be throttled or killed on exactly the devices that matter most.
 *
 * So correctness rests on AdhanAlarmReceiver's chain (each firing alarm arms
 * the next, ~6x a day, riding the exact-alarm path OEMs interfere with least)
 * and on AdhanBootReceiver. This worker exists for the one case those cannot
 * cover: the chain being broken all at once — every alarm dropped while the
 * device stays up, so no boot event and no next alarm to continue from.
 *
 * If it runs, good. If Samsung never lets it run, the design still holds.
 *
 * Cheap by construction: no network constraint (it touches no network), no
 * battery constraint (it must work precisely when the device is being
 * aggressive), and the work itself is a SharedPreferences read plus at most
 * [AdhanScheduler.ARMED_WINDOW] AlarmManager calls.
 */
class AdhanRearmWorker(
  context: Context,
  params: WorkerParameters,
) : Worker(context, params) {

  companion object {
    private const val TAG = "AdhanRearmWorker"
    private const val WORK_NAME = "adhan-rearm-periodic"

    /**
     * 12 hours: comfortably above WorkManager's 15-minute minimum period, and
     * short enough that even a couple of missed runs leave the ~6.7-day armed
     * window far from lapsing. There is no value in running this often — the
     * chain does the routine work.
     */
    private const val INTERVAL_HOURS = 12L

    /**
     * Idempotent. KEEP means an existing schedule is left alone, so calling
     * this on every app open and every boot cannot pile up duplicates or reset
     * the period.
     */
    fun ensureScheduled(context: Context) {
      // The plain Java builder, not the reified PeriodicWorkRequestBuilder<T>
      // helper: that one lives in work-runtime-ktx, which this app does NOT
      // currently resolve. Using it would mean adding a dependency, and the
      // whole point of this worker was that WorkManager is already present.
      val request = PeriodicWorkRequest.Builder(
        AdhanRearmWorker::class.java,
        INTERVAL_HOURS,
        TimeUnit.HOURS,
      ).build()

      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        WORK_NAME,
        ExistingPeriodicWorkPolicy.KEEP,
        request,
      )
      Log.i(TAG, "ensured periodic re-arm work (${INTERVAL_HOURS}h)")
    }

    /**
     * Stop the periodic work. Called when the schedule is cleared (azan turned
     * off, or short azan selected) so the app is not waking every 12 hours to
     * re-arm a schedule that no longer exists. Re-enabling azan calls
     * [ensureScheduled] again.
     */
    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
      Log.i(TAG, "cancelled periodic re-arm work")
    }
  }

  override fun doWork(): Result {
    return try {
      val armed = AdhanScheduler.rearm(applicationContext)
      Log.i(TAG, "re-armed $armed alarms")
      // Success even at 0: an empty or fully-consumed schedule is a legitimate
      // state (azan off, or the 30-day list exhausted and awaiting an app
      // open). Retrying would burn the app's already-scarce background budget
      // for nothing.
      Result.success()
    } catch (e: Exception) {
      Log.e(TAG, "re-arm failed", e)
      Result.retry()
    }
  }
}
