import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme, PRAYER_CONFIG } from '@/constants/theme';
import {
  getPrayerTimes,
  formatTime,
  getTimeRemaining,
  PrayerTimesResult,
  PrayerName,
  PrayerTimeEntry,
} from '@/services/prayerService';
import { getCurrentLocation, LocationResult } from '@/services/locationService';
import {
  getCalculationMethod,
  getEnabledPrayers,
  getAdvanceMinutes,
  getSavedLocation,
  setSavedLocation,
} from '@/services/storageService';
import AdBanner from '@/components/AdBanner';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesResult | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  const loadPrayerTimes = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (prayerTimes?.nextPrayerTime) {
        setCountdown(getTimeRemaining(prayerTimes.nextPrayerTime));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrayerTimes();
    setRefreshing(false);
  }, [loadPrayerTimes]);

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
        <Text style={styles.errorHint}>Pull down to retry</Text>
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

  const nextPrayerConfig = prayerTimes?.nextPrayer
    ? PRAYER_CONFIG[prayerTimes.nextPrayer]
    : null;

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
        </LinearGradient>

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
  errorHint: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.sm,
    marginTop: 4,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
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
});
