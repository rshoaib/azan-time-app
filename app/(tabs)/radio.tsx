import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/theme';
import {
  RADIO_CATEGORIES,
  RADIO_STATIONS,
  RadioCategory,
  RadioStation,
} from '@/data/radioStations';
import { useInterstitialAd } from '@/services/adsService';
import { getAudioModule } from '@/services/audioModuleLoader';
import { configureAudio } from '@/services/audioService';
import { useNavigation } from 'expo-router';

export default function RadioScreen() {
  const [activeCategory, setActiveCategory] = useState<RadioCategory>('featured');
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const soundRef = useRef<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barHeights = useRef([16, 28, 20, 32, 24]).current;

  // Preload an interstitial. Shown before playback starts; frequency-capped
  // and non-blocking (see useInterstitialAd in adsService).
  const { tryShow: tryShowInterstitial } = useInterstitialAd('interstitialRadioPlay');

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isPlaying]);

  const navigation = useNavigation();

  // Stop playback when navigating away from this tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [navigation]);

  const playStation = async (station: RadioStation) => {
    const Audio = await getAudioModule();
    if (!Audio) {
      setAudioAvailable(false);
      setCurrentStation(station);
      return;
    }

    const previousSound = soundRef.current;
    soundRef.current = null;
    if (previousSound) {
      try {
        await previousSound.stopAsync();
        await previousSound.unloadAsync();
      } catch {}
    }

    setIsPlaying(false);
    setIsLoading(true);
    setCurrentStation(station);

    try {
      await configureAudio();

      const { sound } = await Audio.Sound.createAsync(
        { uri: station.url },
        { shouldPlay: true, volume: 1.0, isLooping: false },
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
        if (status.error) {
          console.warn('Playback error:', status.error);
          setIsPlaying(false);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.warn('Failed to play radio:', error);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const togglePlayback = async (station: RadioStation) => {
    if (currentStation?.id === station.id && isPlaying) {
      await stopPlayback();
      return;
    }
    // Show interstitial (if ready + not frequency-capped), then start playback.
    // `tryShow` calls the callback immediately when no ad is shown, so the
    // user is never blocked.
    tryShowInterstitial(() => {
      playStation(station).catch((err) => console.warn('playStation error:', err));
    });
  };

  const filteredStations = useMemo(
    () => RADIO_STATIONS.filter((s) => s.category === activeCategory),
    [activeCategory]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#F5F6FA', '#EEF0F6']} style={styles.header}>
          <Text style={styles.title}>📻 Quran Radio</Text>
          <Text style={styles.subtitle}>Listen to beautiful Quran recitations 24/7</Text>
        </LinearGradient>

        {/* Now Playing Card */}
        {currentStation && (
          <View style={styles.nowPlayingSection}>
            <Animated.View
              style={[
                styles.nowPlayingCard,
                isPlaying && {
                  borderColor: Theme.colors.teal + '60',
                  ...Theme.shadows.glow,
                },
              ]}
            >
              <LinearGradient
                colors={isPlaying ? ['#0D9488', '#0F766E'] : ['#5A6180', '#3D425A']}
                style={styles.nowPlayingGradient}
              >
                {/* Sound wave visualizer */}
                <View style={styles.visualizer}>
                  {barHeights.map((h, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.visualizerBar,
                        {
                          height: isPlaying ? h : 8,
                          opacity: isPlaying ? pulseAnim : 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingLabel}>
                    {isLoading ? '⏳ Connecting...' : isPlaying ? '🔴 NOW PLAYING' : '⏸ PAUSED'}
                  </Text>
                  <Text style={styles.nowPlayingName} numberOfLines={1}>
                    {currentStation.name}
                  </Text>
                  <Text style={styles.nowPlayingReciter} numberOfLines={1}>
                    {currentStation.reciter}
                  </Text>
                </View>

                {/* Play/Stop Button */}
                <Pressable
                  style={styles.mainPlayButton}
                  onPress={() => togglePlayback(currentStation)}
                  disabled={isLoading}
                >
                  <View style={styles.mainPlayCircle}>
                    {isLoading ? (
                      <Animated.View style={{ opacity: pulseAnim }}>
                        <FontAwesome name="spinner" size={24} color="#FFFFFF" />
                      </Animated.View>
                    ) : isPlaying ? (
                      <FontAwesome name="stop" size={20} color="#FFFFFF" />
                    ) : (
                      <FontAwesome name="play" size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
                    )}
                  </View>
                </Pressable>
              </LinearGradient>
            </Animated.View>

            {/* Audio unavailable notice */}
            {!audioAvailable && (
              <View style={styles.audioNotice}>
                <Text style={styles.audioNoticeText}>
                  ⚠️ Audio not available in Expo Go. Use a development build to stream radio.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Category Tabs */}
        <View style={styles.categoryBar}>
          {RADIO_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[styles.categoryTab, activeCategory === cat.key && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === cat.key && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Station count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Station List */}
        <View style={styles.stationList}>
          {filteredStations.map((station) => {
            const isActive = currentStation?.id === station.id;
            const isStationPlaying = isActive && isPlaying;
            const isStationLoading = isActive && isLoading;

            return (
              <Pressable
                key={station.id}
                style={({ pressed }) => [
                  styles.stationCard,
                  isActive && styles.stationCardActive,
                  pressed && styles.stationCardPressed,
                ]}
                onPress={() => togglePlayback(station)}
              >
                {/* Station Icon */}
                <View
                  style={[
                    styles.stationIcon,
                    isStationPlaying && styles.stationIconPlaying,
                  ]}
                >
                  {isStationLoading ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                      <Text style={styles.stationIconText}>⏳</Text>
                    </Animated.View>
                  ) : isStationPlaying ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                      <Text style={styles.stationIconText}>🔊</Text>
                    </Animated.View>
                  ) : (
                    <Text style={styles.stationIconText}>
                      {station.isFeatured ? '⭐' : '🎙️'}
                    </Text>
                  )}
                </View>

                {/* Station Info */}
                <View style={styles.stationInfo}>
                  <Text
                    style={[
                      styles.stationName,
                      isStationPlaying && styles.stationNamePlaying,
                    ]}
                    numberOfLines={1}
                  >
                    {station.name}
                  </Text>
                  <Text style={styles.stationReciter} numberOfLines={1}>
                    {station.reciter}
                  </Text>
                </View>

                {/* Play indicator */}
                <View style={styles.stationAction}>
                  {isStationPlaying ? (
                    <View style={styles.liveIndicator}>
                      <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  ) : (
                    <FontAwesome name="play-circle" size={28} color={Theme.colors.teal + '80'} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Footer credit */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by mp3quran.net • Free Quran Radio
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 12 },
  title: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.heavy,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
  },

  // Now Playing
  nowPlayingSection: { paddingHorizontal: 20, marginBottom: 8 },
  nowPlayingCard: {
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  nowPlayingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
  },
  visualizerBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  nowPlayingInfo: { flex: 1 },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: Theme.fontWeight.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nowPlayingName: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  nowPlayingReciter: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
  },
  mainPlayButton: { marginLeft: 8 },
  mainPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Audio notice
  audioNotice: {
    marginTop: 8,
    padding: 10,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.warning + '15',
    borderWidth: 1,
    borderColor: Theme.colors.warning + '25',
  },
  audioNoticeText: {
    fontSize: 11,
    color: Theme.colors.warning,
    textAlign: 'center',
    fontWeight: Theme.fontWeight.medium,
  },

  // Category tabs
  categoryBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
  },
  categoryTabActive: {
    backgroundColor: Theme.colors.cardHighlight,
    borderWidth: 1,
    borderColor: Theme.colors.teal + '30',
  },
  categoryEmoji: { fontSize: 16, marginBottom: 2 },
  categoryLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: Theme.fontWeight.medium,
  },
  categoryLabelActive: {
    color: Theme.colors.teal,
    fontWeight: Theme.fontWeight.bold,
  },

  // Count row
  countRow: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  countText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
    fontWeight: Theme.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Station list
  stationList: { paddingHorizontal: 20 },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    gap: 12,
  },
  stationCardActive: {
    borderColor: Theme.colors.teal + '40',
    backgroundColor: Theme.colors.teal + '06',
  },
  stationCardPressed: {
    backgroundColor: Theme.colors.cardHighlight,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Theme.colors.teal + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationIconPlaying: {
    backgroundColor: Theme.colors.teal + '22',
  },
  stationIconText: { fontSize: 20 },
  stationInfo: { flex: 1 },
  stationName: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  stationNamePlaying: {
    color: Theme.colors.teal,
  },
  stationReciter: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
  },
  stationAction: {
    width: 36,
    alignItems: 'center',
  },

  // Live indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.danger + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.danger,
  },
  liveText: {
    fontSize: 9,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.danger,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
});
