/**
 * contactService — pure message-composition logic for the Contact & Feedback
 * screen.
 *
 * Deliberately free of React Native / Expo imports so it runs unit-testable
 * under the node Jest environment. The screen gathers the live Diagnostics
 * (version, device, OS) and passes them in.
 */

export type ContactCategory = 'question' | 'feature' | 'problem' | 'build';

export interface CategoryOption {
  key: ContactCategory;
  /** Row title shown in the category picker. */
  label: string;
  /** One-line explainer under the title. */
  sub: string;
  /** Short tag stamped into the message subject/first line, e.g. "[Problem]". */
  tag: string;
}

export const CONTACT_CATEGORIES: readonly CategoryOption[] = [
  { key: 'question', label: 'Ask a question', sub: 'Something unclear? Just ask.', tag: 'Question' },
  { key: 'feature', label: 'Request a feature', sub: 'Tell me what the app is missing.', tag: 'Feature request' },
  { key: 'problem', label: 'Report a problem', sub: 'Something broken or behaving wrong.', tag: 'Problem' },
  { key: 'build', label: 'Build me an app like this', sub: 'Business enquiry — get a similar app made for you.', tag: 'App-build enquiry' },
] as const;

export const WHATSAPP_PLACEHOLDER = '__SET_ME__';

/** Everything the message needs to say about the install, gathered by the screen. */
export interface Diagnostics {
  appName: string;
  version: string; // versionName, e.g. '1.1.2'
  versionCode: string; // e.g. '12'
  deviceModel: string; // e.g. 'samsung SM-S938B'
  osVersion: string; // e.g. 'Android 15'
}

/** True once the placeholder has been replaced with a plausible phone number. */
export function isWhatsAppConfigured(num: string): boolean {
  if (!num || num.includes(WHATSAPP_PLACEHOLDER)) return false;
  return num.replace(/\D/g, '').length >= 8;
}

function tagFor(category: ContactCategory): string {
  const found = CONTACT_CATEGORIES.find((c) => c.key === category);
  return found ? found.tag : 'Question';
}

/**
 * The full prefilled message body: category tag + user's text (or a write-here
 * hint) + a diagnostics block so bug reports never need a "what version /
 * what phone?" round trip.
 */
export function composeMessage(category: ContactCategory, d: Diagnostics, userMessage?: string): string {
  const body = userMessage && userMessage.trim() ? userMessage.trim() : '(write your message here)';
  return [
    `[${tagFor(category)}] ${d.appName}`,
    '',
    body,
    '',
    '----------------',
    `App: ${d.appName} ${d.version} (build ${d.versionCode})`,
    `Device: ${d.deviceModel}`,
    `OS: ${d.osVersion}`,
  ].join('\n');
}

/** Email subject line, mirroring the message's category tag. */
export function composeSubject(category: ContactCategory, d: Diagnostics): string {
  return `[${tagFor(category)}] ${d.appName} ${d.version} (${d.versionCode})`;
}

/** wa.me deep link — opens the WhatsApp chat with the message prefilled. */
export function buildWhatsAppUrl(num: string, message: string): string {
  return `https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/** mailto: fallback carrying the same subject + diagnostics. */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
