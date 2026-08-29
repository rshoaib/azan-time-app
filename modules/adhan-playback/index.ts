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
/** A snapshot of remaining alarm cover. See AdhanScheduler.horizonInfo. */
export interface AdhanHorizonInfo {
  /** Total instants persisted (~30 days' worth), past and future. */
  persistedTotal: number;
  /** Persisted instants still in the future. */
  futureCount: number;
  /**
   * How many were ACTUALLY armed at the last re-arm — recorded, not recomputed,
   * so a partial failure is visible rather than hidden behind an optimistic
   * estimate.
   */
  armedCount: number;
  /**
   * Epoch ms of the last re-arm (0 if never). Far older than the worker
   * interval means the chain and the worker have both stopped.
   */
  lastArmedAtMs: number;
  /** Epoch ms of the furthest future instant, or 0 if none. */
  furthestMs: number;
  /** Epoch ms of the next one due, or 0 if none. */
  nextMs: number;
}

/** One fire-time record, written by the service when an adhan actually ran. */
export interface AdhanFiredRecord {
  /** Epoch ms at which it happened — stamped at fire time, not at upload. */
  t: number;
  /** res/raw sound name. */
  s: string;
  /** 'started' when playback began, 'played' when it ran to natural completion. */
  e: 'started' | 'played';
}

export interface AdhanPlaybackModule {
  /** Create a guaranteed-silent notification channel (immutable once created). */
  ensureSilentChannel(id: string, name: string, description: string): boolean;
  /**
   * Hand over the full schedule. times = epoch ms; sounds[i] = res/raw name for
   * times[i]. The whole list is persisted; only a rolling window is armed.
   * Returns the number ARMED, which is intentionally less than times.length.
   */
  schedule(times: number[], sounds: string[], title: string, body: string): number;
  cancelAll(): boolean;
  /** Register the periodic re-arm worker (idempotent). */
  ensureRearmWorker(): boolean;
  /** Remaining cover — read before re-arming to measure the silent failure. */
  horizonInfo(): AdhanHorizonInfo;
  /** JSON array string of AdhanFiredRecord; clears the log as it returns it. */
  drainFiredLog(): string;
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

/**
 * Drain the fire-time log, parsed. Returns [] when the module is absent or the
 * stored JSON is unreadable — this is diagnostics, and it must never be able to
 * throw into a caller on the app-open path.
 */
export function drainFiredLog(): AdhanFiredRecord[] {
  if (!AdhanPlayback) return [];
  try {
    const parsed = JSON.parse(AdhanPlayback.drainFiredLog() || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Remaining alarm cover, or null when the native module is unavailable. */
export function getHorizonInfo(): AdhanHorizonInfo | null {
  if (!AdhanPlayback) return null;
  try {
    return AdhanPlayback.horizonInfo();
  } catch {
    return null;
  }
}
