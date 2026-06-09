import { SHARE_FOOTER } from '@/constants/storeLinks';
import { PRAYER_CONFIG, Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { getDailyAyah } from '@/data/dailyAyah';
import { getCurrentLocation, LocationResult, maybeRefreshLocation } from '@/services/locationService';
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
import { E2E, e2eConsumeForceError, e2eNow } from '@/services/e2eConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Linking,
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
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesResult | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [calcMethod, setCalcMethod] = useState('MuslimWorldLeague');
  const isLoadingRef = useRef(false);

  // Render prayer times for a location and (re)schedule its notifications.
  // Called once with the cached location for an instant first paint, and again
  // with a fresh location when the user has travelled to a new city.
  const applyLocation = useCallback(async (loc: LocationResult) => {
    setLocation(loc);

    const method = await getCalculationMethod();
    setCalcMethod(method);
    const times = getPrayerTimes(loc.latitude, loc.longitude, e2eNow(), method);
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
  }, []);

  const loadPrayerTimes = useCallback(async (opts: { force?: boolean } = {}) => {
    // Prevent concurrent calls (race between focus + countdown)
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setError(null);
      if (E2E && e2eConsumeForceError()) throw new Error('E2E: simulated load failure');

      // 1. Paint instantly from the cached location (also the offline fallback).
      //    Only block on GPS on a true first run, when nothing is cached yet.
      let loc = await getSavedLocation();
      if (!loc) {
        loc = await getCurrentLocation();
        await setSavedLocation(loc);
      }
      await applyLocation(loc as LocationResult);
      setLoading(false); // content is on screen — don't block it on revalidation

      // 2. Revalidate against GPS so prayer times follow the user when they
      //    travel. Throttled, unless the user forced it via pull-to-refresh.
      const fresh = await maybeRefreshLocation(loc as LocationResult, { force: opts.force });
      if (fresh) await applyLocation(fresh);
    } catch (e: any) {
      setError(e.message || "Couldn't load prayer times. Check your connection and try again.");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [applyLocation]);

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
    // Pull-to-refresh is an explicit user request — force a fresh GPS fix so a
    // traveller can pull down to update their city/prayer times immediately.
    await loadPrayerTimes({ force: true });
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
      <LinearGradient colors={[c.background, c.backgroundLight]} style={styles.loadingContainer}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
        <View style={styles.loadingPulse}>
          <Text style={{ fontSize: 40 }}>🕌</Text>
        </View>
        <ActivityIndicator size="large" color={c.gold} />
        <Text style={styles.loadingText}>Finding your prayer times...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[c.background, c.backgroundLight]} style={styles.loadingContainer}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
        <FontAwesome name="exclamation-circle" size={48} color={c.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry"
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open device settings"
          onPress={() => Linking.openSettings()}
          style={{ marginTop: 14 }}
          hitSlop={8}
        >
          <Text style={{ color: c.teal, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold }}>Open Settings</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const today = e2eNow();
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
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.gold}
            colors={[c.gold]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[c.background, c.surfaceDark]}
          style={styles.header}
        >
          <Pressable
            testID="home-open-settings"
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <FontAwesome name="cog" size={22} color={c.textSecondary} />
          </Pressable>
          <Text style={styles.bismillah}>﷽</Text>
          <Text style={styles.appTitle}>Azan Time</Text>
          {location && (
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={12} color={c.goldText} />
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
              colors={c.ramadanGradient}
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
              colors={c.heroGradient}
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
                <FontAwesome name="clock-o" size={14} color={c.goldLight} />
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

        {/* Daily Ayah Card */}
        <View style={styles.ayahWrapper}>
          <LinearGradient
            colors={c.ayahGradient}
            style={styles.ayahCard}
          >
            <Text style={styles.ayahSectionLabel}>📖 VERSE OF THE DAY</Text>
            <Text style={styles.ayahArabic}>{ayah.arabic}</Text>
            <Text style={styles.ayahTranslation}>"{ayah.translation}"</Text>
            <View style={styles.ayahFooter}>
              <Text style={styles.ayahReference}>{ayah.reference}</Text>
              <Pressable
                style={styles.shareButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Share verse of the day"
                onPress={() => Share.share({
                  // Share text includes store install links from constants/storeLinks —
                  // every share is a free install surface.
                  message: `${ayah.arabic}\n\n"${ayah.translation}"\n\n— ${ayah.reference}${SHARE_FOOTER}`,
                })}
              >
                <FontAwesome name="share-alt" size={14} color={c.teal} />
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
                <Text style={styles.comparisonTime}>{day.maghribStr}</Text>
              </View>
            ))}
          </View>
          <View style={styles.comparisonLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.fajr }]} />
              <Text style={styles.legendText}>Fajr</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.maghrib }]} />
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
  const styles = useThemeStyles(makeStyles);

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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
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
    gap: Theme.spacing.md,
  },
  loadingPulse: {
    marginBottom: Theme.spacing.smd,
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: Theme.fontSize.md,
  },
  errorText: {
    color: c.danger,
    fontSize: Theme.fontSize.md,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: c.teal,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.smd,
    borderRadius: Theme.borderRadius.full,
    marginTop: Theme.spacing.md,
  },
  retryButtonText: {
    color: c.onAccent,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: Theme.spacing.mlg,
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: Theme.spacing.xs,
  },
  bismillah: {
    fontSize: 36,
    color: c.gold,
    marginBottom: 6,
  },
  appTitle: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.heavy,
    color: c.textPrimary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.gold + '15',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: c.gold + '25',
    marginBottom: 6,
  },
  locationText: {
    fontSize: Theme.fontSize.sm,
    color: c.goldText,
    fontWeight: Theme.fontWeight.semibold,
  },
  dateText: {
    fontSize: Theme.fontSize.sm,
    color: c.textSecondary,
    marginTop: 2,
  },

  // Hero Card
  heroWrapper: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  heroCard: {
    borderRadius: Theme.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.gold + '20',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: c.gold + '08',
  },
  heroCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: c.gold + '05',
  },
  heroCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -40,
    backgroundColor: c.fajr + '05',
  },
  heroLabel: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: Theme.spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.xs,
  },
  heroEmoji: {
    fontSize: Theme.fontSize.xxl,
  },
  heroName: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: c.goldLight,
  },
  heroTime: {
    fontSize: Theme.fontSize.hero,
    fontWeight: Theme.fontWeight.heavy,
    color: c.onAccent,
    marginBottom: Theme.spacing.smd,
    letterSpacing: 1,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  countdownText: {
    fontSize: Theme.fontSize.md,
    color: c.goldLight,
    fontWeight: Theme.fontWeight.semibold,
  },

  // Prayer List
  prayerList: {
    paddingHorizontal: Theme.spacing.lg,
  },
  prayerListTitle: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: Theme.spacing.smd,
    paddingLeft: Theme.spacing.xs,
  },
  prayerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  prayerCardNext: {
    backgroundColor: c.cardHighlight,
    borderColor: c.gold + '40',
    borderWidth: 1.5,
  },
  prayerCardPast: {
    backgroundColor: c.surfaceDark,
    borderColor: c.cardBorder + '40',
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
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerEmoji: {
    fontSize: Theme.fontSize.mlg,
  },
  prayerName: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: c.textPrimary,
  },
  prayerNameNext: {
    color: c.textPrimary,
    fontWeight: Theme.fontWeight.bold,
  },
  prayerNamePast: {
    color: c.textSecondary,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: 2,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.emerald,
  },
  currentText: {
    fontSize: Theme.fontSize.xs,
    color: c.emerald,
    fontWeight: Theme.fontWeight.semibold,
  },
  pastLabel: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    marginTop: 1,
  },
  prayerTime: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: c.textPrimary,
  },
  prayerTimeNext: {
    color: c.teal,
    fontWeight: Theme.fontWeight.bold,
    fontSize: Theme.fontSize.mlg,
  },
  prayerTimePast: {
    color: c.textMuted,
  },

  // Hijri date
  hijriText: {
    fontSize: Theme.fontSize.xs,
    color: c.goldText,
    marginTop: 2,
    fontWeight: Theme.fontWeight.medium,
  },

  // Ramadan banner
  ramadanWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.md },
  ramadanCard: { borderRadius: Theme.borderRadius.xl, padding: Theme.spacing.mlg, borderWidth: 1, borderColor: c.ramadanBorder + '40' },
  ramadanHeader: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.smd, marginBottom: Theme.spacing.md },
  ramadanTitle: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, color: c.ramadanText },
  ramadanDay: { fontSize: Theme.fontSize.sm, color: c.ramadanTextDim, marginTop: 2 },
  ramadanTimes: { flexDirection: 'row', gap: Theme.spacing.smd },
  ramadanTimeBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.smd, alignItems: 'center' },
  ramadanTimeLabel: { fontSize: Theme.fontSize.xs, color: c.ramadanText, marginBottom: Theme.spacing.xs },
  ramadanTimeValue: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: c.onAccent },

  // Daily Ayah
  ayahWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.lg },
  ayahCard: { borderRadius: Theme.borderRadius.xl, padding: Theme.spacing.lg, borderWidth: 1, borderColor: c.ayahBorder },
  ayahSectionLabel: { fontSize: Theme.fontSize.xs, color: c.goldText, textTransform: 'uppercase', letterSpacing: 2, fontWeight: Theme.fontWeight.semibold, marginBottom: Theme.spacing.md },
  ayahArabic: { fontSize: Theme.fontSize.xl, color: c.ayahArabicText, textAlign: 'right', lineHeight: 44, fontWeight: '600', marginBottom: Theme.spacing.smd },
  ayahTranslation: { fontSize: Theme.fontSize.md, color: c.ayahBodyText, lineHeight: 24, fontStyle: 'italic', marginBottom: Theme.spacing.smd },
  ayahFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ayahReference: { fontSize: Theme.fontSize.sm, color: c.goldText, fontWeight: Theme.fontWeight.semibold },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.teal + '15', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Theme.borderRadius.full },
  shareText: { fontSize: Theme.fontSize.sm, color: c.teal, fontWeight: Theme.fontWeight.semibold },

  // Prayer comparison chart
  comparisonWrapper: { paddingHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.lg },
  comparisonTitle: { fontSize: Theme.fontSize.xs, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: Theme.fontWeight.semibold, marginBottom: Theme.spacing.smd },
  comparisonChart: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.card, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.md, borderWidth: 1, borderColor: c.cardBorder },
  comparisonDay: { alignItems: 'center', flex: 1 },
  comparisonLabel: { fontSize: Theme.fontSize.xs, color: c.textMuted, marginBottom: 6, fontWeight: Theme.fontWeight.semibold },
  comparisonBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', marginBottom: 6 },
  comparisonBar: { width: 8, borderRadius: 4 },
  comparisonBarFajr: { backgroundColor: c.fajr },
  comparisonBarMaghrib: { backgroundColor: c.maghrib },
  comparisonTime: { fontSize: Theme.fontSize.xs, color: c.textSecondary, fontWeight: Theme.fontWeight.medium },
  comparisonLegend: { flexDirection: 'row', justifyContent: 'center', gap: Theme.spacing.mlg, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Theme.fontSize.xs, color: c.textMuted },
});
