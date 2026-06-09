/**
 * English — the source-of-truth locale. All other locales should mirror
 * these keys exactly. When you add a new string, add it here FIRST, then
 * add translations to ar.ts, id.ts, ur.ts.
 */

export const en = {
    // App chrome
    app_name: 'Azan Time',
    loading_prayer_times: 'Finding your prayer times...',
    retry: 'Retry',

    // Home screen
    next_prayer: 'NEXT PRAYER',
    todays_prayers: "Today's Prayers",
    up_next: 'Up Next',
    passed: 'Passed',
    verse_of_the_day: 'VERSE OF THE DAY',
    share: 'Share',

    // Ramadan
    ramadan_mubarak: 'Ramadan Mubarak',
    ramadan_day_of: 'Day {day} of 30 · {left} days left',
    suhoor_ends: 'Suhoor ends',
    iftar_at: 'Iftar at',

    // Prayer names
    prayer_fajr: 'Fajr',
    prayer_sunrise: 'Sunrise',
    prayer_dhuhr: 'Dhuhr',
    prayer_asr: 'Asr',
    prayer_maghrib: 'Maghrib',
    prayer_isha: 'Isha',

    // Tracker
    tracker_title: 'Prayer Tracker',
    tracker_subtitle: 'Track your daily prayers',
    tracker_day_streak: 'Day Streak',
    tracker_today: 'Today',
    tracker_todays_prayers: "TODAY'S PRAYERS",
    tracker_tap_hint: 'Tap to cycle: Prayed → Missed → Qada → Reset',
    tracker_this_week: 'THIS WEEK',
    tracker_dont_break_chain: "Don't break the chain",
    tracker_share_streak: 'Share streak',
    tracker_achievements: 'ACHIEVEMENTS',

    // Qibla
    qibla_title: 'Qibla',
    qibla_works_offline: 'Works offline',
    qibla_aligned: 'Aligned with Kaaba',

    // Settings
    settings_title: 'Settings',
    settings_subtitle: 'Customize your Azan experience',
    settings_calculation: 'PRAYER CALCULATION',
    settings_calculation_method: 'Calculation Method',
    settings_notifications: 'NOTIFICATIONS',
    settings_enable_notifications: 'Enable Notifications',
    settings_notify_before: 'Notify Before',
    settings_per_prayer: 'Notify for each prayer:',
    settings_azan_sound: 'AZAN SOUND',
    settings_play_azan: 'Play Azan Audio',
    settings_azan_reciter: 'Azan Reciter',
    settings_location: 'LOCATION',
    settings_about: 'ABOUT',
    settings_language: 'Language',
    settings_privacy: 'Privacy Policy',

    // Share texts
    share_footer: 'Shared via Azan Time',
    share_get_app: 'Get the app',

    // Home (i18n migration)
    home_error_load: "Couldn't load prayer times. Check your connection and try again.",
    home_open_settings: 'Open Settings',
    home_comparison_title: '📊 Fajr & Maghrib This Week',

    // Tracker (i18n migration)
    tracker_title_emoji: '📊 Prayer Tracker',
    tracker_tap_hint_emoji: 'Tap to cycle: ✅ Prayed → ❌ Missed → 🔄 Qada → ⬜ Reset',
    tracker_status_prayed: 'Prayed',
    tracker_status_missed: 'Missed',
    tracker_status_qada: 'Qada',
    tracker_log: 'Log',
    tracker_motivation_100: '100+ days! May Allah bless your consistency 💎',
    tracker_motivation_30: '30+ days — alhamdulillah! Keep going 🌟',
    tracker_motivation_7: "7-day streak! Don't break the chain 🔥",
    tracker_motivation_3: 'Great progress! Stay consistent 💪',
    tracker_motivation_started: "You've started — keep it up 🤲",
    tracker_dont_break_chain_emoji: "🔥 Don't break the chain",
    tracker_chain_counting: '{count} days and counting',
    tracker_chain_day_of: 'Day {count} of your streak',
    tracker_achievements_emoji: '🏆 ACHIEVEMENTS',
    tracker_unlock_badges: 'Pray consistently to unlock badges!',
    tracker_next_achievement: 'Next: {emoji} {title} ({current}/{requirement} days)',

    // Dua
    dua_title: 'Dua & Dhikr',
    dua_subtitle: 'Daily remembrance of Allah',
    dua_tab_morning: 'Morning',
    dua_tab_evening: 'Evening',
    dua_tab_daily: 'Daily',
    dua_tab_tasbih: 'Tasbih',
    dua_listen: 'Listen',
    dua_stop: 'Stop',
    dua_hide_translation: 'Hide translation',
    dua_show_translation: 'Show translation',
    dua_tasbih_of: 'of {count}',
    dua_reset_counter: 'Reset Counter',

    // Qibla
    qibla_screen_title: 'Qibla & Mosques',
    qibla_subtitle: 'Direction to the Holy Kaaba',
    qibla_heading: 'HEADING',
    qibla_label: 'QIBLA',
    qibla_facing: 'Facing Qibla',
    qibla_mosques_near_me: 'Mosques Near Me',
    qibla_searching: 'Searching...',
    qibla_mosques_count: '{count} found within 5 km',
    qibla_finding_mosques: 'Finding nearby mosques...',
    qibla_no_mosques: 'No mosques within 5 km',
    qibla_no_mosques_hint: 'Try again later or check your connection',
    qibla_error: "Couldn't find the Qibla. Make sure location is on, then move your phone in a figure-8 to calibrate.",

    // Tilawat (radio)
    tilawat_title: 'Quran Tilawat',
    tilawat_subtitle: 'Quran recitations, anytime',
    tilawat_cat_featured: 'Featured',
    tilawat_cat_reciters: 'Reciters',
    tilawat_cat_special: 'Special',
    tilawat_cat_translations: 'Translations',
    tilawat_connecting: 'Connecting...',
    tilawat_now_playing: 'NOW PLAYING',
    tilawat_paused: 'PAUSED',
    tilawat_live: 'LIVE',
    tilawat_station_count_one: '{count} station',
    tilawat_station_count_other: '{count} stations',
    tilawat_audio_unavailable: "Audio isn't available in this preview. Install the app to listen.",
    tilawat_footer: 'Powered by {source} • Free Quran Recitations',

    // Settings (i18n migration)
    settings_appearance: 'APPEARANCE',
    settings_theme: 'Theme',
    settings_theme_light: 'Light',
    settings_theme_dark: 'Dark',
    settings_theme_auto: 'Auto',
    settings_theme_a11y: '{theme} theme',
    settings_play_azan_on: 'Plays when prayer time arrives',
    settings_play_azan_off: 'Notification only',
    settings_short_azan: 'Short Azan',
    settings_short_azan_on: 'Plays a brief adhan',
    settings_short_azan_off: 'Plays the full adhan',
    settings_reciter_default: 'Default',
    settings_update_location: 'Update Location',
    settings_updating_location: 'Updating location…',
    settings_location_hint: 'Tap to detect your location',
    settings_location_updated: 'Updated to {place}',
    settings_location_error: "Couldn't get your location. Check that location is on.",
    settings_notification_time: 'Notification Time',
    settings_version: 'Version {version}',
    settings_about_blurb: 'Prayer times calculated using the Adhan library with high-precision astronomical algorithms.',
};
