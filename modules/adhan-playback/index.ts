import { requireOptionalNativeModule } from 'expo';

/**
 * Native adhan playback (Android only).
 *
 * The full adhan is played by a foreground service with USAGE_ALARM rather than
 * being bound to a notification channel sound — Android hands channel sounds to
 * the notification player, which truncates anything longer than a chime. See
 * modules/adhan-playback/android/.../AdhanPlaybackService.kt for the full note.
 *
 * `requireOptionalNativeModule` so Expo Go / iOS / Jest get a null and the
 * callers fall back to the existing expo-audio foreground path.
 */
export interface AdhanPlaybackModule {
  /** Create a guaranteed-silent notification channel (immutable once created). */
  ensureSilentChannel(id: string, name: string, description: string): boolean;
  /** Schedule exact alarms. times = epoch ms; sounds[i] = res/raw name for times[i]. */
  schedule(times: number[], sounds: string[], title: string, body: string): number;
  cancelAll(): boolean;
  playNow(sound: string, title: string, body: string): boolean;
  stop(): boolean;
  isPlaying(): boolean;
}

const AdhanPlayback = requireOptionalNativeModule<AdhanPlaybackModule>('AdhanPlayback');

export default AdhanPlayback;

/** True when the native service is actually available on this build. */
export function isAdhanServiceAvailable(): boolean {
  return AdhanPlayback != null;
}

/**
 * Fires when an adhan plays through to its natural end (not on stop/error).
 * This is the replacement for expo-audio's didJustFinish callback, which the ad
 * service used as its "genuine completion moment" interstitial trigger.
 * Returns an unsubscribe function; a no-op when the native module is absent.
 */
export function addAdhanFinishedListener(cb: () => void): () => void {
  if (!AdhanPlayback) return () => {};
  const sub = (AdhanPlayback as any).addListener('onAdhanFinished', cb);
  return () => sub?.remove?.();
}
