// Premium light-mode Islamic theme — clean, warm & elegant
export const Theme = {
    colors: {
        // Primary palette - warm whites & soft grays
        background: '#F5F6FA',
        backgroundLight: '#FFFFFF',
        surfaceDark: '#EEF0F6',

        // Card colors - soft elevated cards
        card: '#FFFFFF',
        cardBorder: '#E2E5F0',
        cardHighlight: '#F0F2FA',
        cardGlass: 'rgba(255, 255, 255, 0.85)',

        // Islamic-inspired accents
        gold: '#D4930D',
        goldLight: '#F5BD42',
        goldDark: '#B07A08',
        emerald: '#10B981',
        emeraldDark: '#059669',
        teal: '#0D9488',

        // Prayer-specific gradient pairs [start, end]
        fajr: '#5B8FE0',
        fajrEnd: '#3A6EC4',
        sunrise: '#F5923A',
        sunriseEnd: '#E07A20',
        dhuhr: '#E8B810',
        dhuhrEnd: '#D4A00A',
        asr: '#F08C00',
        asrEnd: '#D97706',
        maghrib: '#E84848',
        maghribEnd: '#C43030',
        isha: '#7C55C8',
        ishaEnd: '#5B3BA0',

        // Text
        textPrimary: '#1A1D2E',
        textSecondary: '#5A6180',
        textMuted: '#9098B1',

        // Tab bar
        tabBar: '#FFFFFF',
        tabBarBorder: '#E8EAF0',
        tabActive: '#0D9488',
        tabInactive: '#9098B1',

        // Status
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',

        // Gradients
        gradientPrimary: ['#F5F6FA', '#E8EAF2'],
        gradientGold: ['#F5BD42', '#D4930D'],
        gradientNextPrayer: ['#0D9488', '#0F766E'],
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 999,
    },

    fontSize: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 18,
        xl: 22,
        xxl: 28,
        hero: 42,
    },

    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
    },

    shadows: {
        card: {
            shadowColor: '#8892B0',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
        },
        glow: {
            shadowColor: '#0D9488',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
        },
    },
};

// Prayer names and their icons (FontAwesome)
export const PRAYER_CONFIG = {
    fajr: { name: 'Fajr', icon: 'moon-o', color: Theme.colors.fajr, emoji: '🌙' },
    sunrise: { name: 'Sunrise', icon: 'sun-o', color: Theme.colors.sunrise, emoji: '🌅' },
    dhuhr: { name: 'Dhuhr', icon: 'sun-o', color: Theme.colors.dhuhr, emoji: '☀️' },
    asr: { name: 'Asr', icon: 'cloud', color: Theme.colors.asr, emoji: '🌤️' },
    maghrib: { name: 'Maghrib', icon: 'adjust', color: Theme.colors.maghrib, emoji: '🌇' },
    isha: { name: 'Isha', icon: 'star', color: Theme.colors.isha, emoji: '⭐' },
};

export const CALCULATION_METHODS = [
    { key: 'MuslimWorldLeague', label: 'Muslim World League' },
    { key: 'Egyptian', label: 'Egyptian General Authority' },
    { key: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
    { key: 'UmmAlQura', label: 'Umm Al-Qura University, Makkah' },
    { key: 'Dubai', label: 'Dubai' },
    { key: 'Qatar', label: 'Qatar' },
    { key: 'Kuwait', label: 'Kuwait' },
    { key: 'Singapore', label: 'Singapore' },
    { key: 'NorthAmerica', label: 'ISNA (North America)' },
    { key: 'Tehran', label: 'Institute of Geophysics, Tehran' },
    { key: 'Turkey', label: 'Diyanet İşleri Başkanlığı, Turkey' },
    { key: 'Other', label: 'Other' },
];
