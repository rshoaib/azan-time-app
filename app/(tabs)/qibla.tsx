import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Magnetometer, type MagnetometerMeasurement } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/constants/theme';
import { getQiblaDirection } from '@/services/prayerService';
import { getCurrentLocation } from '@/services/locationService';
import { getSavedLocation } from '@/services/storageService';
import { findNearbyMosques, formatDistance, navigateToMosque, Mosque } from '@/services/mosqueService';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.65, 280);

export default function QiblaScreen() {
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [showMosques, setShowMosques] = useState(false);

  useEffect(() => {
    loadQibla();
    startCompass();
    return () => {
      Magnetometer.removeAllListeners();
    };
  }, []);

  const loadQibla = async () => {
    try {
      let loc = await getSavedLocation();
      if (!loc) {
        loc = await getCurrentLocation();
      }
      const angle = getQiblaDirection(loc.latitude, loc.longitude);
      setQiblaAngle(angle);
      setLocationName(loc.city || '');

      // Load mosques
      setLoadingMosques(true);
      const nearby = await findNearbyMosques(loc.latitude, loc.longitude, 5000);
      setMosques(nearby);
      setLoadingMosques(false);
    } catch (e: any) {
      setError(e.message || 'Failed to determine Qibla direction');
      setLoadingMosques(false);
    }
  };

  const startCompass = () => {
    Magnetometer.setUpdateInterval(100);
    Magnetometer.addListener((data: MagnetometerMeasurement) => {
      const { x, y } = data;
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = angle >= 0 ? angle : angle + 360;
      const compassHeading = (360 - angle) % 360;
      setHeading(compassHeading);
    });
  };

  const qiblaRotation = qiblaAngle !== null ? qiblaAngle - heading : 0;
  const isAligned = qiblaAngle !== null && Math.abs(qiblaRotation % 360) < 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#F5F6FA', '#EEF0F6']} style={styles.header}>
          <Text style={styles.title}>🕋 Qibla & Mosques</Text>
          <Text style={styles.subtitle}>Direction to the Holy Kaaba</Text>
          {locationName ? (
            <View style={styles.locationBadge}>
              <FontAwesome name="map-marker" size={11} color={Theme.colors.gold} />
              <Text style={styles.locationText}>{locationName}</Text>
            </View>
          ) : null}
        </LinearGradient>

        {error ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={40} color={Theme.colors.danger} />
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

                  <LinearGradient colors={isAligned ? ['#00E676', '#00C853'] : [Theme.colors.gold, Theme.colors.goldDark]} style={styles.centerDot} />
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
                <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.infoPill}>
                  <Text style={styles.infoLabel}>HEADING</Text>
                  <Text style={styles.infoValue}>{Math.round(heading)}°</Text>
                </LinearGradient>
                {qiblaAngle !== null && (
                  <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.infoPill}>
                    <Text style={styles.infoLabel}>QIBLA</Text>
                    <Text style={[styles.infoValue, { color: Theme.colors.gold }]}>{Math.round(qiblaAngle)}°</Text>
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
                  color={Theme.colors.textMuted}
                />
              </Pressable>

              {showMosques && (
                <View style={styles.mosquesList}>
                  {loadingMosques ? (
                    <View style={styles.mosquesLoading}>
                      <ActivityIndicator size="small" color={Theme.colors.gold} />
                      <Text style={styles.mosquesLoadingText}>Finding nearby mosques...</Text>
                    </View>
                  ) : mosques.length === 0 ? (
                    <View style={styles.mosquesEmpty}>
                      <Text style={{ fontSize: 32 }}>🏜️</Text>
                      <Text style={styles.mosquesEmptyText}>No mosques found nearby</Text>
                      <Text style={styles.mosquesEmptyHint}>Try expanding the search area</Text>
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
                            <FontAwesome name="location-arrow" size={12} color={Theme.colors.gold} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: Theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary, marginBottom: 8 },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Theme.colors.gold + '12', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Theme.borderRadius.full, borderWidth: 1, borderColor: Theme.colors.gold + '20',
  },
  locationText: { fontSize: Theme.fontSize.xs, color: Theme.colors.gold, fontWeight: Theme.fontWeight.semibold },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 60 },
  errorText: { color: Theme.colors.danger, fontSize: Theme.fontSize.md, textAlign: 'center', paddingHorizontal: 32 },

  // Compass
  compassContainer: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  compassGlow: {
    width: COMPASS_SIZE + 14, height: COMPASS_SIZE + 14, borderRadius: (COMPASS_SIZE + 14) / 2,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Theme.colors.cardBorder,
  },
  compassGlowAligned: {
    borderColor: Theme.colors.emerald + '60',
    shadowColor: Theme.colors.emerald, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  compassRing: {
    width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE / 2,
    backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.cardBorder,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  compassCard: {
    width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'absolute',
    justifyContent: 'center', alignItems: 'center',
  },
  cardinalContainer: { position: 'absolute', width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  cardinalText: { fontSize: 14, fontWeight: Theme.fontWeight.bold, color: Theme.colors.textSecondary },
  cardinalNorth: { color: Theme.colors.danger, fontSize: 16 },
  cardinalNorthPos: { top: 24 },
  cardinalEastPos: { right: 20 },
  cardinalSouthPos: { bottom: 24 },
  cardinalWestPos: { left: 20 },
  degreeMark: { position: 'absolute', width: 1.5, transformOrigin: 'center center' },
  degreeMarkMajor: { height: 12, backgroundColor: Theme.colors.textSecondary },
  degreeMarkMinor: { height: 5, backgroundColor: Theme.colors.textMuted + '60' },
  qiblaArrowContainer: {
    position: 'absolute', width: COMPASS_SIZE, height: COMPASS_SIZE,
    justifyContent: 'flex-start', alignItems: 'center',
  },
  qiblaArrow: {
    marginTop: 14, zIndex: 5, backgroundColor: Theme.colors.gold + '15',
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Theme.colors.gold + '30',
  },
  qiblaArrowAligned: { backgroundColor: Theme.colors.emerald + '20', borderColor: Theme.colors.emerald + '50' },
  qiblaLine: {
    width: 2.5, height: COMPASS_SIZE / 2 - 52,
    backgroundColor: Theme.colors.gold + '40', marginTop: -2, borderRadius: 2,
  },
  qiblaLineAligned: { backgroundColor: Theme.colors.emerald + '50' },
  centerDot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
    borderColor: Theme.colors.background, zIndex: 10,
  },
  alignedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: Theme.colors.emerald + '15', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Theme.borderRadius.full, borderWidth: 1, borderColor: Theme.colors.emerald + '30',
  },
  alignedText: { fontSize: Theme.fontSize.sm, color: Theme.colors.emerald, fontWeight: Theme.fontWeight.bold },

  // Info pills
  infoContainer: { flexDirection: 'row', marginTop: 16, gap: 14 },
  infoPill: {
    alignItems: 'center', paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.cardBorder, minWidth: 90,
  },
  infoLabel: {
    fontSize: 10, color: Theme.colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 1.5, fontWeight: Theme.fontWeight.semibold, marginBottom: 2,
  },
  infoValue: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.heavy, color: Theme.colors.textPrimary },

  // Mosques Section
  mosquesSection: {
    marginTop: 24, marginHorizontal: 20, backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.cardBorder, overflow: 'hidden',
  },
  mosquesSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  mosquesSectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mosquesSectionTitle: { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold, color: Theme.colors.textPrimary },
  mosquesSectionCount: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted, marginTop: 1 },

  // Mosque list
  mosquesList: { borderTopWidth: 1, borderTopColor: Theme.colors.cardBorder },
  mosquesLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center',
  },
  mosquesLoadingText: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary },
  mosquesEmpty: { alignItems: 'center', padding: 24, gap: 6 },
  mosquesEmptyText: { fontSize: Theme.fontSize.md, color: Theme.colors.textSecondary },
  mosquesEmptyHint: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted },

  // Mosque Card
  mosqueCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.cardBorder + '50',
  },
  mosqueCardPressed: { backgroundColor: Theme.colors.cardHighlight },
  mosqueCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mosqueIndex: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Theme.colors.emerald + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  mosqueIndexText: { fontSize: 12, fontWeight: Theme.fontWeight.bold, color: Theme.colors.emerald },
  mosqueInfo: { flex: 1 },
  mosqueName: { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.semibold, color: Theme.colors.textPrimary },
  mosqueAddress: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted, marginTop: 1 },
  mosqueCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mosqueDistance: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold, color: Theme.colors.teal },
  navigateBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Theme.colors.gold + '15',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.gold + '25',
  },
});
