import { Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { getCurrentLocation, LocationResult, maybeRefreshLocation } from '@/services/locationService';
import { findNearbyMosques, formatDistance, Mosque, navigateToMosque } from '@/services/mosqueService';
import { getQiblaDirection } from '@/services/prayerService';
import { recordQiblaUse } from '@/services/reviewPromptService';
import { getSavedLocation, setSavedLocation } from '@/services/storageService';
import { E2E } from '@/services/e2eConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Magnetometer, type MagnetometerMeasurement } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.65, 280);

export default function QiblaScreen() {
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [showMosques, setShowMosques] = useState(false);
  const wasAlignedRef = useRef(false);

  useEffect(() => {
    loadQibla();
    startCompass();
    // Track Qibla usage — after 3 successful uses the review service
    // will prompt the native review dialog (once per 90 days max).
    recordQiblaUse();
    return () => {
      Magnetometer.removeAllListeners();
    };
  }, []);

  // Point the compass and load nearby mosques for a location. Called with the
  // cached location first, then again with a fresh one if the user has travelled.
  const applyLocation = async (loc: LocationResult) => {
    setQiblaAngle(getQiblaDirection(loc.latitude, loc.longitude));
    setLocationName(loc.city || '');

    // Load mosques
    setLoadingMosques(true);
    const nearby = await findNearbyMosques(loc.latitude, loc.longitude, 5000);
    setMosques(nearby);
    setLoadingMosques(false);
  };

  const loadQibla = async () => {
    try {
      // Paint instantly from cache; detect + persist on a true first run.
      let loc = await getSavedLocation();
      if (!loc) {
        loc = await getCurrentLocation();
        await setSavedLocation(loc);
      }
      await applyLocation(loc as LocationResult);

      // Follow the user when they travel — refresh Qibla + mosques for the new city.
      const fresh = await maybeRefreshLocation(loc as LocationResult);
      if (fresh) await applyLocation(fresh);
    } catch (e: any) {
      setError(e.message || "Couldn't find the Qibla. Make sure location is on, then move your phone in a figure-8 to calibrate.");
      setLoadingMosques(false);
    }
  };

  const startCompass = () => {
    if (E2E) return; // E2E: heading is driven to the Qibla bearing (see effect below)
    Magnetometer.setUpdateInterval(100);
    Magnetometer.addListener((data: MagnetometerMeasurement) => {
      const { x, y } = data;
      // atan2(x, y) gives the angle of the magnetic field from the device's
      // forward (y) axis. Negate it to get the device's compass heading
      // (where the device points, measured clockwise from magnetic north).
      const angle = Math.atan2(x, y) * (180 / Math.PI);
      const compassHeading = (360 - angle) % 360;
      setHeading(compassHeading);
    });
  };

  const qiblaRotation = qiblaAngle !== null ? qiblaAngle - heading : 0;
  // Properly handle wrap-around near 0°/360° for alignment detection
  const normalizedRotation = ((qiblaRotation % 360) + 360) % 360;
  const isAligned = qiblaAngle !== null && (normalizedRotation < 10 || normalizedRotation > 350);

  // Haptic feedback when aligning with Qibla
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned]);

  // E2E: drive the heading to the Qibla bearing so the "Facing Qibla" aligned
  // state is deterministic (the real magnetometer can't be controlled in a test).
  useEffect(() => {
    if (E2E && qiblaAngle !== null) setHeading(qiblaAngle);
  }, [qiblaAngle]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={[c.background, c.surfaceDark]} style={styles.header}>
          <Text style={styles.title}>🕋 Qibla & Mosques</Text>
          <Text style={styles.subtitle}>Direction to the Holy Kaaba</Text>
          {locationName ? (
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={11} color={c.goldText} />
              <Text style={styles.locationText}>{locationName}</Text>
            </View>
          ) : null}
        </LinearGradient>

        {error ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={40} color={c.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Compass */}
            <View style={styles.compassContainer}>
              <View style={[styles.compassGlow, isAligned && styles.compassGlowAligned]}>
                <View style={styles.compassRing}>
                  <View style={[styles.compassCard, { transform: [{ rotate: `${-heading}deg` }] }]}>
                    <View style={[styles.cardinalContainer, styles.cardinalNorthPos]}>
                      <Text style={[styles.cardinalText, styles.cardinalNorth]}>N</Text>
                    </View>
                    <View style={[styles.cardinalContainer, styles.cardinalEastPos]}>
                      <Text style={styles.cardinalText}>E</Text>
                    </View>
                    <View style={[styles.cardinalContainer, styles.cardinalSouthPos]}>
                      <Text style={styles.cardinalText}>S</Text>
                    </View>
                    <View style={[styles.cardinalContainer, styles.cardinalWestPos]}>
                      <Text style={styles.cardinalText}>W</Text>
                    </View>
                    {Array.from({ length: 72 }).map((_, i) => (
                      <View key={i} style={[styles.degreeMark, i % 6 === 0 ? styles.degreeMarkMajor : styles.degreeMarkMinor, { transform: [{ rotate: `${i * 5}deg` }, { translateY: -(COMPASS_SIZE / 2 - 22) }] }]} />
                    ))}
                  </View>

                  {qiblaAngle !== null && (
                    <View style={[styles.qiblaArrowContainer, { transform: [{ rotate: `${qiblaRotation}deg` }] }]}>
                      <View style={[styles.qiblaArrow, isAligned && styles.qiblaArrowAligned]}>
                        <Text style={{ fontSize: 20 }}>🕋</Text>
                      </View>
                      <View style={[styles.qiblaLine, isAligned && styles.qiblaLineAligned]} />
                    </View>
                  )}

                  <LinearGradient colors={isAligned ? ['#00E676', '#00C853'] : [c.gold, c.goldDark]} style={styles.centerDot} />
                </View>
              </View>

              {isAligned && (
                <View style={styles.alignedBadge}>
                  <Text style={{ fontSize: 14 }}>✅</Text>
                  <Text style={styles.alignedText}>Facing Qibla</Text>
                </View>
              )}

              {/* Info pills */}
              <View style={styles.infoContainer}>
                <LinearGradient colors={c.gradientNextPrayer} style={styles.infoPill}>
                  <Text style={styles.infoLabel}>HEADING</Text>
                  <Text style={styles.infoValue}>{Math.round(heading)}°</Text>
                </LinearGradient>
                {qiblaAngle !== null && (
                  <LinearGradient colors={c.gradientNextPrayer} style={styles.infoPill}>
                    <Text style={styles.infoLabel}>QIBLA</Text>
                    <Text style={[styles.infoValue, { color: c.goldLight }]}>{Math.round(qiblaAngle)}°</Text>
                  </LinearGradient>
                )}
              </View>
            </View>

            {/* Mosques Near Me Section */}
            <View style={styles.mosquesSection}>
              <Pressable
                style={styles.mosquesSectionHeader}
                onPress={() => setShowMosques(!showMosques)}
              >
                <View style={styles.mosquesSectionLeft}>
                  <Text style={{ fontSize: 20 }}>🕌</Text>
                  <View>
                    <Text style={styles.mosquesSectionTitle}>Mosques Near Me</Text>
                    <Text style={styles.mosquesSectionCount}>
                      {loadingMosques ? 'Searching...' : `${mosques.length} found within 5km`}
                    </Text>
                  </View>
                </View>
                <FontAwesome
                  name={showMosques ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={c.textMuted}
                />
              </Pressable>

              {showMosques && (
                <View style={styles.mosquesList}>
                  {loadingMosques ? (
                    <View style={styles.mosquesLoading}>
                      <ActivityIndicator size="small" color={c.gold} />
                      <Text style={styles.mosquesLoadingText}>Finding nearby mosques...</Text>
                    </View>
                  ) : mosques.length === 0 ? (
                    <View style={styles.mosquesEmpty}>
                      <Text style={{ fontSize: 32 }}>🏜️</Text>
                      <Text style={styles.mosquesEmptyText}>No mosques within 5 km</Text>
                      <Text style={styles.mosquesEmptyHint}>Try again later or check your connection</Text>
                    </View>
                  ) : (
                    mosques.slice(0, 15).map((mosque, idx) => (
                      <Pressable
                        key={mosque.id}
                        style={({ pressed }) => [styles.mosqueCard, pressed && styles.mosqueCardPressed]}
                        onPress={() => navigateToMosque(mosque.latitude, mosque.longitude, mosque.name)}
                      >
                        <View style={styles.mosqueCardLeft}>
                          <View style={styles.mosqueIndex}>
                            <Text style={styles.mosqueIndexText}>{idx + 1}</Text>
                          </View>
                          <View style={styles.mosqueInfo}>
                            <Text style={styles.mosqueName} numberOfLines={1}>{mosque.name}</Text>
                            {mosque.address ? (
                              <Text style={styles.mosqueAddress} numberOfLines={1}>{mosque.address}</Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.mosqueCardRight}>
                          <Text style={styles.mosqueDistance}>{formatDistance(mosque.distance)}</Text>
                          <View style={styles.navigateBtn}>
                            <FontAwesome name="location-arrow" size={12} color={c.gold} />
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: c.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Theme.fontSize.sm, color: c.textSecondary, marginBottom: 8 },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.gold + '12', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Theme.borderRadius.full, borderWidth: 1, borderColor: c.gold + '20',
  },
  locationText: { fontSize: Theme.fontSize.xs, color: c.goldText, fontWeight: Theme.fontWeight.semibold },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 60 },
  errorText: { color: c.danger, fontSize: Theme.fontSize.md, textAlign: 'center', paddingHorizontal: 32 },

  // Compass
  compassContainer: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  compassGlow: {
    width: COMPASS_SIZE + 14, height: COMPASS_SIZE + 14, borderRadius: (COMPASS_SIZE + 14) / 2,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: c.cardBorder,
  },
  compassGlowAligned: {
    borderColor: c.emerald + '60',
    shadowColor: c.emerald, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  compassRing: {
    width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE / 2,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  compassCard: {
    width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'absolute',
    justifyContent: 'center', alignItems: 'center',
  },
  cardinalContainer: { position: 'absolute', width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  cardinalText: { fontSize: 14, fontWeight: Theme.fontWeight.bold, color: c.textSecondary },
  cardinalNorth: { color: c.danger, fontSize: 16 },
  cardinalNorthPos: { top: 24 },
  cardinalEastPos: { right: 20 },
  cardinalSouthPos: { bottom: 24 },
  cardinalWestPos: { left: 20 },
  degreeMark: { position: 'absolute', width: 1.5, transformOrigin: 'center center' },
  degreeMarkMajor: { height: 12, backgroundColor: c.textSecondary },
  degreeMarkMinor: { height: 5, backgroundColor: c.textMuted + '60' },
  qiblaArrowContainer: {
    position: 'absolute', width: COMPASS_SIZE, height: COMPASS_SIZE,
    justifyContent: 'flex-start', alignItems: 'center',
  },
  qiblaArrow: {
    marginTop: 14, zIndex: 5, backgroundColor: c.gold + '15',
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: c.gold + '30',
  },
  qiblaArrowAligned: { backgroundColor: c.emerald + '20', borderColor: c.emerald + '50' },
  qiblaLine: {
    width: 2.5, height: COMPASS_SIZE / 2 - 52,
    backgroundColor: c.gold + '40', marginTop: -2, borderRadius: 2,
  },
  qiblaLineAligned: { backgroundColor: c.emerald + '50' },
  centerDot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
    borderColor: c.background, zIndex: 10,
  },
  alignedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: c.emerald + '15', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Theme.borderRadius.full, borderWidth: 1, borderColor: c.emerald + '30',
  },
  alignedText: { fontSize: Theme.fontSize.sm, color: c.emerald, fontWeight: Theme.fontWeight.bold },

  // Info pills
  infoContainer: { flexDirection: 'row', marginTop: 16, gap: 14 },
  infoPill: {
    alignItems: 'center', paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: c.cardBorder, minWidth: 90,
  },
  infoLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase',
    letterSpacing: 1.5, fontWeight: Theme.fontWeight.semibold, marginBottom: 2,
  },
  infoValue: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.heavy, color: '#FFFFFF' },

  // Mosques Section
  mosquesSection: {
    marginTop: 24, marginHorizontal: Theme.spacing.lg, backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden',
  },
  mosquesSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  mosquesSectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mosquesSectionTitle: { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold, color: c.textPrimary },
  mosquesSectionCount: { fontSize: Theme.fontSize.xs, color: c.textMuted, marginTop: 1 },

  // Mosque list
  mosquesList: { borderTopWidth: 1, borderTopColor: c.cardBorder },
  mosquesLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center',
  },
  mosquesLoadingText: { fontSize: Theme.fontSize.sm, color: c.textSecondary },
  mosquesEmpty: { alignItems: 'center', padding: 24, gap: 6 },
  mosquesEmptyText: { fontSize: Theme.fontSize.md, color: c.textSecondary },
  mosquesEmptyHint: { fontSize: Theme.fontSize.xs, color: c.textMuted },

  // Mosque Card
  mosqueCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.cardBorder + '50',
  },
  mosqueCardPressed: { backgroundColor: c.cardHighlight },
  mosqueCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mosqueIndex: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: c.emerald + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  mosqueIndexText: { fontSize: 12, fontWeight: Theme.fontWeight.bold, color: c.emerald },
  mosqueInfo: { flex: 1 },
  mosqueName: { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.semibold, color: c.textPrimary },
  mosqueAddress: { fontSize: Theme.fontSize.xs, color: c.textMuted, marginTop: 1 },
  mosqueCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mosqueDistance: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold, color: c.teal },
  navigateBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.gold + '15',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.gold + '25',
  },
});
