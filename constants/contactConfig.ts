/**
 * ⚠ CONTACT CHANNELS — the single place to change how users reach us.
 *
 * whatsappNumber: full international number, DIGITS ONLY (no '+', no spaces) —
 * this exact string goes into the wa.me deep link. If it is ever reset to the
 * '__SET_ME__' placeholder the Contact screen hides the WhatsApp option
 * entirely and offers email only.
 * whatsappNumberDisplay: the same number, human-readable, for UI text.
 */
export const CONTACT_CONFIG = {
  appName: 'Azan Time',
  whatsappNumber: '923224609117',
  whatsappNumberDisplay: '+92 322 4609117',
  email: 'segmentbi@gmail.com',
} as const;
