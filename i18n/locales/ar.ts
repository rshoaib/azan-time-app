/**
 * Arabic (ar) — RTL.
 * Translated with care; reviewed against common Islamic app conventions.
 * When you ship, ask a native speaker on r/islam to proofread. Most
 * common mistake in competitors' apps: machine-translated Arabic that
 * uses the wrong register.
 */

import type { en } from './en';

export const ar: Partial<typeof en> = {
    app_name: 'وقت الأذان',
    loading_prayer_times: 'جارٍ تحديد مواقيت الصلاة...',
    retry: 'إعادة المحاولة',

    next_prayer: 'الصلاة القادمة',
    todays_prayers: 'صلوات اليوم',
    up_next: 'التالية',
    passed: 'فاتت',
    verse_of_the_day: 'آية اليوم',
    share: 'مشاركة',

    ramadan_mubarak: 'رمضان مبارك',
    ramadan_day_of: 'اليوم {day} من 30 · متبقي {left} أيام',
    suhoor_ends: 'ينتهي السحور',
    iftar_at: 'الإفطار عند',

    prayer_fajr: 'الفجر',
    prayer_sunrise: 'الشروق',
    prayer_dhuhr: 'الظهر',
    prayer_asr: 'العصر',
    prayer_maghrib: 'المغرب',
    prayer_isha: 'العشاء',

    tracker_title: 'متتبع الصلاة',
    tracker_subtitle: 'تتبع صلواتك اليومية',
    tracker_day_streak: 'أيام متتالية',
    tracker_today: 'اليوم',
    tracker_todays_prayers: 'صلوات اليوم',
    tracker_tap_hint: 'اضغط للتبديل: صُليت ← فاتت ← قضاء ← إعادة',
    tracker_this_week: 'هذا الأسبوع',
    tracker_dont_break_chain: 'لا تقطع السلسلة',
    tracker_share_streak: 'شارك إنجازك',
    tracker_achievements: 'الإنجازات',

    qibla_title: 'القبلة',
    qibla_works_offline: 'يعمل بدون إنترنت',
    qibla_aligned: 'متجه نحو الكعبة',

    settings_title: 'الإعدادات',
    settings_subtitle: 'خصص تجربتك',
    settings_calculation: 'طريقة الحساب',
    settings_calculation_method: 'طريقة حساب الصلاة',
    settings_notifications: 'الإشعارات',
    settings_enable_notifications: 'تفعيل الإشعارات',
    settings_notify_before: 'التنبيه قبل',
    settings_per_prayer: 'تنبيه لكل صلاة:',
    settings_azan_sound: 'صوت الأذان',
    settings_play_azan: 'تشغيل الأذان',
    settings_azan_reciter: 'صوت الأذان',
    settings_location: 'الموقع',
    settings_about: 'حول التطبيق',
    settings_language: 'اللغة',
    settings_privacy: 'سياسة الخصوصية',

    share_footer: 'تمت المشاركة عبر تطبيق وقت الأذان',
    share_get_app: 'حمّل التطبيق',

    // Home (i18n migration)
    home_error_load: 'تعذّر تحميل مواقيت الصلاة. تحقق من اتصالك وحاول مرة أخرى.',
    home_open_settings: 'فتح الإعدادات',
    home_comparison_title: '📊 الفجر والمغرب هذا الأسبوع',

    // Tracker (i18n migration)
    tracker_title_emoji: '📊 متتبع الصلاة',
    tracker_tap_hint_emoji: 'اضغط للتبديل: ✅ صُليت ← ❌ فاتت ← 🔄 قضاء ← ⬜ إعادة',
    tracker_status_prayed: 'صُليت',
    tracker_status_missed: 'فاتت',
    tracker_status_qada: 'قضاء',
    tracker_log: 'تسجيل',
    tracker_motivation_100: 'أكثر من 100 يوم! بارك الله في مواظبتك 💎',
    tracker_motivation_30: 'أكثر من 30 يومًا — الحمد لله! واصل 🌟',
    tracker_motivation_7: 'سلسلة 7 أيام! لا تقطعها 🔥',
    tracker_motivation_3: 'تقدّم رائع! حافظ على الاستمرار 💪',
    tracker_motivation_started: 'لقد بدأت — استمر 🤲',
    tracker_dont_break_chain_emoji: '🔥 لا تقطع السلسلة',
    tracker_chain_counting: '{count} يوم وتزداد',
    tracker_chain_day_of: 'اليوم {count} من سلسلتك',
    tracker_achievements_emoji: '🏆 الإنجازات',
    tracker_unlock_badges: 'واظب على الصلاة لفتح الأوسمة!',
    tracker_next_achievement: 'التالي: {emoji} {title} ({current}/{requirement} يوم)',

    // Dua
    dua_title: 'الأدعية والأذكار',
    dua_subtitle: 'ذكر الله اليومي',
    dua_tab_morning: 'الصباح',
    dua_tab_evening: 'المساء',
    dua_tab_daily: 'يومية',
    dua_tab_tasbih: 'تسبيح',
    dua_listen: 'استماع',
    dua_stop: 'إيقاف',
    dua_hide_translation: 'إخفاء الترجمة',
    dua_show_translation: 'إظهار الترجمة',
    dua_tasbih_of: 'من {count}',
    dua_reset_counter: 'تصفير العدّاد',

    // Qibla (extended)
    qibla_screen_title: 'القبلة والمساجد',
    qibla_subtitle: 'الاتجاه نحو الكعبة المشرفة',
    qibla_heading: 'الاتجاه',
    qibla_label: 'القبلة',
    qibla_facing: 'تواجه القبلة',
    qibla_mosques_near_me: 'المساجد القريبة',
    qibla_searching: 'جارٍ البحث...',
    qibla_mosques_count: '{count} ضمن 5 كم',
    qibla_finding_mosques: 'جارٍ البحث عن مساجد قريبة...',
    qibla_no_mosques: 'لا توجد مساجد ضمن 5 كم',
    qibla_no_mosques_hint: 'حاول لاحقًا أو تحقق من اتصالك',
    qibla_error: 'تعذّر تحديد القبلة. تأكد من تفعيل الموقع، ثم حرّك هاتفك على شكل الرقم 8 للمعايرة.',

    // Tilawat (radio)
    tilawat_title: 'تلاوة القرآن',
    tilawat_subtitle: 'تلاوات قرآنية في أي وقت',
    tilawat_cat_featured: 'مميزة',
    tilawat_cat_reciters: 'القرّاء',
    tilawat_cat_special: 'خاصة',
    tilawat_cat_translations: 'ترجمات',
    tilawat_connecting: 'جارٍ الاتصال...',
    tilawat_now_playing: 'يُشغّل الآن',
    tilawat_paused: 'متوقّف مؤقتًا',
    tilawat_live: 'مباشر',
    tilawat_station_count_one: 'محطة واحدة',
    tilawat_station_count_other: '{count} محطة',
    tilawat_audio_unavailable: 'الصوت غير متاح في هذه المعاينة. ثبّت التطبيق للاستماع.',
    tilawat_footer: 'مُقدّم من {source} • تلاوات قرآنية مجانية',

    // Settings (i18n migration)
    settings_appearance: 'المظهر',
    settings_theme: 'السمة',
    settings_theme_light: 'فاتح',
    settings_theme_dark: 'داكن',
    settings_theme_auto: 'تلقائي',
    settings_theme_a11y: 'سمة {theme}',
    settings_play_azan_on: 'يُشغّل عند دخول وقت الصلاة',
    settings_play_azan_off: 'إشعار فقط',
    settings_short_azan: 'أذان قصير',
    settings_short_azan_on: 'يُشغّل أذانًا موجزًا',
    settings_short_azan_off: 'يُشغّل الأذان كاملًا',
    settings_reciter_default: 'افتراضي',
    settings_update_location: 'تحديث الموقع',
    settings_updating_location: 'جارٍ تحديث الموقع…',
    settings_location_hint: 'اضغط لتحديد موقعك',
    settings_location_updated: 'تم التحديث إلى {place}',
    settings_location_error: 'تعذّر تحديد موقعك. تأكد من تفعيل خدمة الموقع.',
    settings_notification_time: 'وقت الإشعار',
    settings_version: 'الإصدار {version}',
    settings_about_blurb: 'تُحسب مواقيت الصلاة باستخدام مكتبة Adhan وخوارزميات فلكية عالية الدقة.',
};
