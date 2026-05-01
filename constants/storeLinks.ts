/**
 * Centralized store URLs. Update these once the app is approved
 * on both stores — every share in the app pulls from here.
 */

// -----------------------------------------------------------------------------
// ⚠️  PRE-SUBMISSION TODO — replace before shipping to the App Store.
// -----------------------------------------------------------------------------
// 1. Create the app record in App Store Connect (apps > + > New App).
// 2. Copy the numeric ID from the resulting URL — looks like:
//      https://appstoreconnect.apple.com/apps/1234567890/...
//    The `1234567890` portion is what goes below.
// 3. Replace '0000000000' with that real ID, then:
//      - git grep '0000000000' — confirm no other placeholders slipped through
//      - re-deploy the marketing/website/ (store link is baked into several pages)
//      - rebuild the app and ship a new version so existing installs get the
//        correct share link on next update.
// -----------------------------------------------------------------------------
export const APP_STORE_ID = '0000000000'; // ⚠️ PLACEHOLDER — see comment above

if (__DEV__ && APP_STORE_ID === '0000000000') {
    // Loud dev-only warning so you won't ship a broken iOS share link by accident.
    console.warn(
        '[storeLinks] APP_STORE_ID is still the placeholder "0000000000". ' +
        'Replace it in constants/storeLinks.ts before App Store submission.'
    );
}

export const STORE_LINKS = {
    ios: `https://apps.apple.com/app/azan-time/id${APP_STORE_ID}`,
    android: `https://play.google.com/store/apps/details?id=com.azantime.app`,
    // Short branded URL if you later set up a redirect at your domain
    short: `https://azantime.app`,
};

/**
 * Standard footer appended to Share.share() payloads.
 * Keep it compact — WhatsApp truncates long shares.
 */
export const SHARE_FOOTER = `

🕌 Shared via Azan Time
📱 iOS: ${STORE_LINKS.ios}
📱 Android: ${STORE_LINKS.android}`;
