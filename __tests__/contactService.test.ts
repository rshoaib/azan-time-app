/**
 * Unit tests for the pure Contact & Feedback message-composition logic.
 * Uniform across all OVC Tech apps — keep in sync when editing one.
 */
import {
  CONTACT_CATEGORIES,
  WHATSAPP_PLACEHOLDER,
  type Diagnostics,
  buildMailtoUrl,
  buildWhatsAppUrl,
  composeMessage,
  composeSubject,
  isWhatsAppConfigured,
} from '../services/contactService';

const DIAG: Diagnostics = {
  appName: 'Azan Time',
  version: '1.3.6',
  versionCode: '33',
  deviceModel: 'samsung SM-S938B',
  osVersion: 'Android 15',
};

describe('composeMessage', () => {
  it('includes every diagnostic field', () => {
    const msg = composeMessage('problem', DIAG);
    expect(msg).toContain('Azan Time 1.3.6 (build 33)');
    expect(msg).toContain('Device: samsung SM-S938B');
    expect(msg).toContain('OS: Android 15');
  });

  it.each([
    ['question', 'Question'],
    ['feature', 'Feature request'],
    ['problem', 'Problem'],
    ['build', 'App-build enquiry'],
  ] as const)('tags category %s as [%s] on the first line', (key, tag) => {
    const firstLine = composeMessage(key, DIAG).split('\n')[0];
    expect(firstLine).toBe(`[${tag}] Azan Time`);
  });

  it('embeds the user message when given, trimmed', () => {
    const msg = composeMessage('question', DIAG, '  My timer froze  ');
    expect(msg).toContain('My timer froze');
    expect(msg).not.toContain('(write your message here)');
  });

  it('falls back to a write-here hint without a user message', () => {
    expect(composeMessage('question', DIAG)).toContain('(write your message here)');
    expect(composeMessage('question', DIAG, '   ')).toContain('(write your message here)');
  });
});

describe('composeSubject', () => {
  it('carries the tag, app name and versions', () => {
    expect(composeSubject('build', DIAG)).toBe('[App-build enquiry] Azan Time 1.3.6 (33)');
  });
});

describe('isWhatsAppConfigured', () => {
  it('rejects the placeholder', () => {
    expect(isWhatsAppConfigured(WHATSAPP_PLACEHOLDER)).toBe(false);
    expect(isWhatsAppConfigured('__SET_ME__')).toBe(false);
  });
  it('rejects empty and junk values', () => {
    expect(isWhatsAppConfigured('')).toBe(false);
    expect(isWhatsAppConfigured('abc')).toBe(false);
    expect(isWhatsAppConfigured('123')).toBe(false);
  });
  it('accepts a real international number', () => {
    expect(isWhatsAppConfigured('971501234567')).toBe(true);
    expect(isWhatsAppConfigured('+971 50 123 4567')).toBe(true);
  });
});

describe('URL builders', () => {
  it('buildWhatsAppUrl strips non-digits and URL-encodes the message', () => {
    const url = buildWhatsAppUrl('+971 50 123 4567', 'line one\nline two & more');
    expect(url).toBe('https://wa.me/971501234567?text=line%20one%0Aline%20two%20%26%20more');
  });

  it('buildMailtoUrl encodes subject and body', () => {
    const url = buildMailtoUrl('a@b.com', 'Hi & bye', 'l1\nl2');
    expect(url).toBe('mailto:a@b.com?subject=Hi%20%26%20bye&body=l1%0Al2');
  });
});

describe('CONTACT_CATEGORIES', () => {
  it('offers exactly the four agreed categories', () => {
    expect(CONTACT_CATEGORIES.map((c) => c.key)).toEqual(['question', 'feature', 'problem', 'build']);
  });
});
