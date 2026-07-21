/**
 * Shared Detox helpers — REUSABLE across the OVC Tech app template.
 *
 * Navigation is by tab label text (the bottom-tab titles from app/(tabs)/_layout).
 * Keep these labels in sync if the tabs are renamed.
 */

const TAB = {
  home: 'Prayers',
  tracker: 'Tracker',
  dua: 'Dua',
  tilawat: 'Tilawat',
  qibla: 'Qibla',
  settings: 'Settings',
};

/** Tap a bottom tab by its visible label. */
async function goToTab(label) {
  await element(by.text(label)).tap();
}

/**
 * Read the numeric value out of a hidden E2E status row (e.g.
 * "interstitials: 2" → 2). Works by pulling the element's text attribute.
 * On Android, getAttributes() returns { text } for a Text view.
 */
async function readCounter(testID) {
  const attrs = await element(by.id(testID)).getAttributes();
  const text = attrs.text ?? attrs.label ?? '';
  const m = String(text).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

/** Launch fresh with the runtime notification permission pre-granted. */
async function launchFresh(overrides = {}) {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: { notifications: 'YES', location: 'inuse' },
    ...overrides,
  });
}

module.exports = { TAB, goToTab, readCounter, launchFresh };
