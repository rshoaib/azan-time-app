import AdBanner from '@/components/AdBanner';
import { SHARE_FOOTER } from '@/constants/storeLinks';
import { PRAYER_CONFIG, Theme } from '@/constants/theme';
import { getDailyAyah } from '@/data/dailyAyah';
import { getCurrentLocation, LocationResult } from '@/services/locationService';
import {
    formatTime,
    getPrayerTimes,
    getTimeRemaining,
    PrayerTimeEntry,
    PrayerTimesResult
} from '@/services/prayerService';
import { getHijriDate, getRamadanInfo } from '@/services/ramadanService';
import { onRamadanMidpoint } from '@/services/reviewPromptService';
import {
    getAdvanceMinutes,
    getCalculationMethod,
    getEnabledPrayers,
    getSavedLocation,
    setSavedLocation,
} from '@/services/storageService';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesResult | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [calcMethod, setCalcMethod] = useState('MuslimWorldLeague');
  const isLoadingRef = useRef(false);

  const loadPrayerTimes = useCallback(async () => {
    // Prevent concurrent calls (race between focus + countdown)
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setError(null);

      let loc = await getSavedLocation();
      if (!loc) {
        const detected = await getCurrentLocation();
        loc = detected;
        await setSavedLocation(detected);
      }
      setLocation(loc as LocationResult);

      const method = await getCalculationMethod();
      setCalcMethod(method);
      const times = getPrayerTimes(loc.latitude, loc.longitude, new Date(), method);
      setPrayerTimes(times);

      // Schedule notifications (dynamically imported to avoid Expo Go errors)
      try {
        const { requestNotificationPermission, schedulePrayerNotifications } =
          await import('@/services/notificationService');
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const enabled = await getEnabledPrayers();
          const advance = await getAdvanceMinutes();
          await schedulePrayerNotifications(times.prayers, enabled, advance);
        }
      } catch {
        // Notification module not available (e.g. Expo Go)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load prayer times');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Load prayer times on mount AND whenever the tab comes into focus
  // (useFocusEffect fires on mount too, so no separate useEffect needed)
  useFocusEffect(
    useCallback(() => {
      loadPrayerTimes();
    }, [loadPrayerTimes])
  );

  // Countdown timer — auto-advances to next prayer when current one passes
  useEffect(() => {
    const timer = setInterval(() => {
      if (prayerTimes?.nextPrayerTime) {
        const remaining = getTimeRemaining(prayerTimes.nextPrayerTime);
        setCountdown(remaining);

        // When current next-prayer has passed, recalculate
        if (remaining === '—') {
          loadPrayerTimes();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes, loadPrayerTimes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrayerTimes();
    setRefreshing(false);
  }, [loadPrayerTimes]);

  // Review prompt — on day 15 of Ramadan (user is emotionally engaged).
  // Service enforces its own frequency cap. Must live above any early returns
  // so the hook order stays stable between render passes.
  useEffect(() => {
    if (!prayerTimes) return;
    const r = getRamadanInfo(prayerTimes);
    if (r.isRamadan && r.dayOfRamadan === 15) {
      onRamadanMidpoint(r.dayOfRamadan);
    }
  }, [prayerTimes]);

  if (loading) {
    return (
      <LinearGradient colors={['#F5F6FA', '#FFFFFF']} style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
        <View style={styles.loadingPulse}>
          <Text style={{ fontSize: 40 }}>🕌</Text>
        </View>
        <ActivityIndicator size="large" color={Theme.colors.gold} />
        <Text style={styles.loadingText}>Finding your prayer times...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#F5F6FA', '#FFFFFF']} style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
        <FontAwesome name="exclamation-circle" size={48} color={Theme.colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            isLoadingRef.current = false;
            loadPrayerTimes();
          }}
        >
          <FontAwesome name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hijri = getHijriDate();
  const ramadan = getRamadanInfo(prayerTimes);
  const ayah = getDailyAyah();

  const nextPrayerConfig = prayerTimes?.nextPrayer
    ? PRAYER_CONFIG[prayerTimes.nextPrayer]
    : null;

  // Prayer comparison data (Fajr & Maghrib for 7 days)
  const weekComparison = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const label = i === 0 ? 'Today' : dayNames[d.getDay()];
    if (!location) return { label, fajrStr: '--', maghribStr: '--', fajrHeight: 20, maghribHeight: 20 };
    try {
      const times = getPrayerTimes(location.latitude, location.longitude, d, calcMethod);
      const fajr = times.prayers.find(p => p.name === 'fajr');
      const maghrib = times.prayers.find(p => p.name === 'maghrib');
      const fajrMin = fajr ? fajr.time.getHours() * 60 + fajr.time.getMinutes() : 0;
      const maghribMin = maghrib ? maghrib.time.getHours() * 60 + maghrib.time.getMinutes() : 0;
      return {
        label,
        fajrStr: fajr ? formatTime(fajr.time).replace(' ', '') : '--',
        maghribStr: maghrib ? formatTime(maghrib.time).replace(' ', '') : '--',
        fajrHeight: Math.max(15, (fajrMin / 360) * 50),
        maghribHeight: Math.max(15, ((maghribMin - 720) / 360) * 50),
      };
    } catch { return { label, fajrStr: '--', maghribStr: '--', fajrHeight: 20, maghribHeight: 20 }; }
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.colors.gold}
            colors={[Theme.colors.gold]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#F5F6FA', '#EEF0F6']}
          style={styles.header}
        >
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={10}
          >
            <FontAwesome name="cog" size={22} color={Theme.colors.textSecondary} />
          </Pressable>
          <Text style={styles.bismillah}>﷽</Text>
          <Text style={styles.appTitle}>Azan Time</Text>
          {location && (
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={12} color={Theme.colors.gold} />
              <Text style={styles.locationText}>
                {location.city}{location.country ? `, ${location.country}` : ''}
              </Text>
            </View>
          )}
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.hijriText}>{hijri.day} {hijri.monthName} {hijri.year} AH</Text>
        </LinearGradient>

        {/* Ramadan Banner */}
        {ramadan.isRamadan && (
          <View style={styles.ramadanWrapper}>
            <LinearGradient
              colors={['#1A472A', '#0D2818']}
              style={styles.ramadanCard}
            >
              <View style={styles.ramadanHeader}>
                <Text style={{ fontSize: 24 }}>🌙</Text>
                <View>
                  <Text style={styles.ramadanTitle}>Ramadan Mubarak</Text>
                  <Text style={styles.ramadanDay}>Day {ramadan.dayOfRamadan} of 30 · {ramadan.daysRemaining} days left</Text>
                </View>
              </View>
              <View style={styles.ramadanTimes}>
                {ramadan.suhoorTime && (
                  <View style={styles.ramadanTimeBox}>
                    <Text style={styles.ramadanTimeLabel}>🍽️ Suhoor ends</Text>
                    <Text style={styles.ramadanTimeValue}>{formatTime(ramadan.suhoorTime)}</Text>
                  </View>
                )}
                {ramadan.iftarTime && (
                  <View style={styles.ramadanTimeBox}>
                    <Text style={styles.ramadanTimeLabel}>🌅 Iftar at</Text>
                    <Text style={styles.ramadanTimeValue}>{formatTime(ramadan.iftarTime)}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Next Prayer Hero Card */}
        {prayerTimes?.nextPrayer && prayerTimes.nextPrayerTime && nextPrayerConfig && (
          <View style={styles.heroWrapper}>
            <LinearGradient
              colors={['#1A2C6B', '#0F1840']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Decorative circles */}
              <View style={[styles.heroCircle, styles.heroCircle1]} />
              <View style={[styles.heroCircle, styles.heroCircle2]} />

              <Text style={styles.heroLabel}>NEXT PRAYER</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroEmoji}>{nextPrayerConfig.emoji}</Text>
                <Text style={styles.heroName}>{nextPrayerConfig.name}</Text>
              </View>
              <Text style={styles.heroTime}>
                {formatTime(prayerTimes.nextPrayerTime)}
              </Text>
              <View style={styles.countdownPill}>
                <FontAwesome name="clock-o" size={14} color="#F5BD42" />
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Prayer Times List */}
        <View style={styles.prayerList}>
          <Text style={styles.prayerListTitle}>Today's Prayers</Text>
          {prayerTimes?.prayers.map((prayer, index) => (
            <PrayerCard
              key={prayer.name}
              prayer={prayer}
              isNext={prayer.name === prayerTimes.nextPrayer}
              isPast={prayer.time < new Date()}
              index={index}
            />
          ))}
        </View>

        {/* Ad Banner */}
        <AdBanner style={{ marginTop: 16, marginHorizontal: 24 }} />

        {/* Daily Ayah Card */}
        <View style={styles.ayahWrapper}>
          <LinearGradient
            colors={['#F0EDE6', '#E8E4DB']}
            style={styles.ayahCard}
          >
            <Text style={styles.ayahSectionLabel}>📖 VERSE OF THE DAY</Text>
            <Text style={styles.ayahArabic}>{ayah.arabic}</Text>
            <Text style={styles.ayahTranslation}>"{ayah.translation}"</Text>
            <View style={styles.ayahFooter}>
              <Text style={styles.ayahReference}>{ayah.reference}</Text>
              <Pressable
                style={styles.shareButton}
                onPress={() => Share.share({
                  // Share text includes store install links from constants/storeLinks —
                  // every share is a free install surface.
                  message: `${ayah.arabic}\n\n"${ayah.translation}"\n\n— ${ayah.reference}${SHARE_FOOTER}`,
                })}
              >
                <FontAwesome name="share-alt" size={14} color={Theme.colors.teal} />
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Prayer Time Comparison */}
        <View style={styles.comparisonWrapper}>
          <Text style={styles.comparisonTitle}>📊 Fajr & Maghrib This Week</Text>
          <View style={styles.comparisonChart}>
            {weekComparison.map((day, i) => (
              <View key={i} style={styles.comparisonDay}>
                <Text style={styles.comparisonLabel}>{day.label}</Text>
                <View style={styles.comparisonBars}>
                  <View style={[styles.comparisonBar, styles.comparisonBarFajr, { height: day.fajrHeight }]} />
                  <View style={[styles.comparisonBar, styles.comparisonBarMaghrib, { height: day.maghribHeight }]} />
                </View>
                <Text style={styles.comparisonTime}>{day.fajrStr}</Text>
                <Text style={[styles.comparisonTime, { color: Theme.colors.maghrib }]}>{day.maghribStr}</Text>
              </View>
            ))}
          </View>
          <View style={styles.comparisonLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Theme.colors.fajr }]} />
              <Text style={styles.legendText}>Fajr</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Theme.colors.maghrib }]} />
              <Text style={styles.legendText}>Maghrib</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function PrayerCard({
  prayer,
  isNext,
  isPast,
  index,
}: {
  prayer: PrayerTimeEntry;
  isNext: boolean;
  isPast: boolean;
  index: number;
}) {
  const config = PRAYER_CONFIG[prayer.name];

  if (isNext) {
    return (
      <View style={[styles.prayerCard, styles.prayerCardNext, Theme.shadows.card]}>
        <View style={styles.prayerCardLeft}>
          <LinearGradient
            colors={[config.color, config.color + '80']}
            style={styles.prayerIconGradient}
          >
            <Text style={styles.prayerEmoji}>{config.emoji}</Text>
          </LinearGradient>
          <View>
            <Text style={[styles.prayerName, styles.prayerNameNext]}>{config.name}</Text>
            <View style={styles.currentBadge}>
              <View style={styles.currentDot} />
              <Text style={styles.currentText}>Up Next</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.prayerTime, styles.prayerTimeNext]}>
          {formatTime(prayer.time)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.prayerCard, isPast && styles.prayerCardPast, Theme.shadows.card]}>
      <View style={styles.prayerCardLeft}>
        <View style={[styles.prayerIconCircle, { backgroundColor: config.color + (isPast ? '15' : '25') }]}>
          <Text style={[styles.prayerEmoji, isPast && { opacity: 0.4 }]}>{config.emoji}</Text>
        </View>
        <View>
          <Text style={[styles.prayerName, isPast && styles.prayerNamePast]}>{config.name}</Text>
          {isPast && <Text style={styles.pastLabel}>Passed</Text>}
        </View>
      </View>
      <Text style={[styles.prayerTime, isPast && styles.prayerTimePast]}>
        {formatTime(prayer.time)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingPulse: {
    marginBottom: 12,
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.md,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: Theme.fontSize.md,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.full,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  bismillah: {
    fontSize: 36,
    color: Theme.colors.gold,
    marginBottom: 6,
  },
  appTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.heavy,
    color: Theme.colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.gold + '15',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.gold + '25',
    marginBottom: 6,
  },
  locationText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.gold,
    fontWeight: Theme.fontWeight.semibold,
  },
  dateText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },

  // Hero Card
  heroWrapper: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: 8,
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: Theme.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.gold + '20',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.gold + '08',
  },
  heroCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: Theme.colors.gold + '05',
  },
  heroCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -40,
    backgroundColor: Theme.colors.fajr + '05',
  },
  heroLabel: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroName: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: '#F5BD42',
  },
  heroTime: {
    fontSize: Theme.fontSize.hero,
    fontWeight: Theme.fontWeight.heavy,
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  countdownText: {
    fontSize: Theme.fontSize.md,
    color: '#F5BD42',
    fontWeight: Theme.fontWeight.semibold,
  },

  // Prayer List
  prayerList: {
    paddingHorizontal: Theme.spacing.lg,
  },
  prayerListTitle: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: 12,
    paddingLeft: 4,
  },
  prayerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  prayerCardNext: {
    backgroundColor: Theme.colors.cardHighlight,
    borderColor: Theme.colors.gold + '40',
    borderWidth: 1.5,
  },
  prayerCardPast: {
    backgroundColor: Theme.colors.surfaceDark,
    borderColor: Theme.colors.cardBorder + '40',
    opacity: 0.6,
  },
  prayerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  prayerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerEmoji: {
    fontSize: 20,
  },
  prayerName: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.textPrimary,
  },
  prayerNameNext: {
    color: Theme.colors.textPrimary,
    fontWeight: Theme.fontWeight.bold,
  },
  prayerNamePast: {
    color: Theme.colors.textSecondary,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.emerald,
  },
  currentText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.emerald,
    fontWeight: Theme.fontWeight.semibold,
  },
  pastLabel: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  prayerTime: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.textPrimary,
  },
  prayerTimeNext: {
    color: Theme.colors.teal,
    fontWeight: Theme.fontWeight.bold,
    fontSize: 20,
  },
  prayerTimePast: {
    color: Theme.colors.textMuted,
  },

  // Hijri date
  hijriText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.goldDark,
    marginTop: 2,
    fontWeight: Theme.fontWeight.medium,
  },

  // Ramadan banner
  ramadanWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: 8, marginBottom: 16 },
  ramadanCard: { borderRadius: Theme.borderRadius.xl, padding: 20, borderWidth: 1, borderColor: '#2E7D32' + '40' },
  ramadanHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ramadanTitle: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, color: '#A5D6A7' },
  ramadanDay: { fontSize: Theme.fontSize.sm, color: '#81C784', marginTop: 2 },
  ramadanTimes: { flexDirection: 'row', gap: 12 },
  ramadanTimeBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Theme.borderRadius.lg, padding: 12, alignItems: 'center' },
  ramadanTimeLabel: { fontSize: Theme.fontSize.xs, color: '#A5D6A7', marginBottom: 4 },
  ramadanTimeValue: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: '#FFFFFF' },

  // Daily Ayah
  ayahWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: 20 },
  ayahCard: { borderRadius: Theme.borderRadius.xl, padding: 24, borderWidth: 1, borderColor: '#D5CFC4' },
  ayahSectionLabel: { fontSize: Theme.fontSize.xs, color: Theme.colors.goldDark, textTransform: 'uppercase', letterSpacing: 2, fontWeight: Theme.fontWeight.semibold, marginBottom: 16 },
  ayahArabic: { fontSize: 22, color: '#2C2C2C', textAlign: 'right', lineHeight: 44, fontWeight: '600', marginBottom: 12 },
  ayahTranslation: { fontSize: Theme.fontSize.md, color: '#5C5C5C', lineHeight: 24, fontStyle: 'italic', marginBottom: 12 },
  ayahFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ayahReference: { fontSize: Theme.fontSize.sm, color: Theme.colors.goldDark, fontWeight: Theme.fontWeight.semibold },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.teal + '15', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Theme.borderRadius.full },
  shareText: { fontSize: Theme.fontSize.sm, color: Theme.colors.teal, fontWeight: Theme.fontWeight.semibold },

  // Prayer comparison chart
  comparisonWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: 24 },
  comparisonTitle: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: Theme.fontWeight.semibold, marginBottom: 12 },
  comparisonChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg, padding: 16, borderWidth: 1, borderColor: Theme.colors.cardBorder },
  comparisonDay: { alignItems: 'center', flex: 1 },
  comparisonLabel: { fontSize: 10, color: Theme.colors.textMuted, marginBottom: 6, fontWeight: Theme.fontWeight.semibold },
  comparisonBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', marginBottom: 6 },
  comparisonBar: { width: 8, borderRadius: 4 },
  comparisonBarFajr: { backgroundColor: Theme.colors.fajr },
  comparisonBarMaghrib: { backgroundColor: Theme.colors.maghrib },
  comparisonTime: { fontSize: 8, color: Theme.colors.fajr, fontWeight: Theme.fontWeight.medium },
  comparisonLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted },
});
