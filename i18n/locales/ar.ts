/**
 * Arabic (ar) — RTL.
 * Translated with care; reviewed against common Islamic app conventions.
 * When you ship, ask a native speaker on r/islam to proofread. Most
 * common mistake in competitors' apps: machine-translated Arabic that
 * uses the wrong register.
 */

import type { en } from './en';

export const ar: typeof en = {
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
};
