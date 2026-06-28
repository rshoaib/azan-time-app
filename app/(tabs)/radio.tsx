import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import {
  RADIO_CATEGORIES,
  RADIO_STATIONS,
  RadioCategory,
  RadioStation,
} from '@/data/radioStations';
import { getAudioModule } from '@/services/audioModuleLoader';
import { configureAudio } from '@/services/audioService';
import { useNavigation } from 'expo-router';

export default function RadioScreen() {
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<RadioCategory>('featured');
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const soundRef = useRef<any>(null);
  // Monotonic request token. Each playStation() call claims the next value;
  // any older load still in flight whose token is no longer current discards
  // itself instead of playing — this is what stops fast switching from leaving
  // two recitations playing at once.
  const playTokenRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barHeights = useRef([16, 28, 20, 32, 24]).current;

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
      playTokenRef.current++; // cancel any in-flight load so it won't start
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
    // Claim this request up-front. A newer tap (or stop/blur) bumps the token,
    // so any earlier load still in flight will see a stale token below and bail
    // instead of starting a second, overlapping recitation.
    const token = ++playTokenRef.current;

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
    if (token !== playTokenRef.current) return; // superseded while stopping old

    setIsPlaying(false);
    setIsLoading(true);
    setCurrentStation(station);

    try {
      await configureAudio();
      if (token !== playTokenRef.current) return; // superseded while configuring

      const { sound } = await Audio.Sound.createAsync(
        { uri: station.url },
        { shouldPlay: true, volume: 1.0, isLooping: false },
      );

      // createAsync starts playback immediately (shouldPlay). If a newer tap
      // superseded us while this was loading, this sound is an orphan — stop
      // and unload it now so it never overlaps the active recitation.
      if (token !== playTokenRef.current) {
        try { await sound.stopAsync(); } catch {}
        try { await sound.unloadAsync(); } catch {}
        return;
      }

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
      // Only clear the loading UI if we're still the active request, so a
      // discarded load can't wipe a newer tap's spinner/playing state.
      if (token === playTokenRef.current) {
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  };

  const stopPlayback = async () => {
    playTokenRef.current++; // cancel any in-flight load so it won't start
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
    playStation(station).catch((err) => console.warn('playStation error:', err));
  };

  const filteredStations = useMemo(
    () => RADIO_STATIONS.filter((s) => s.category === activeCategory),
    [activeCategory]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={[c.background, c.surfaceDark]} style={[styles.header, { paddingTop: insets.top + Theme.spacing.smd }]}>
          <Text style={styles.title}>📖 Quran Tilawat</Text>
          <Text style={styles.subtitle}>Quran recitations, anytime</Text>
        </LinearGradient>

        {/* Now Playing Card */}
        {currentStation && (
          <View style={styles.nowPlayingSection}>
            <Animated.View
              testID="radio-now-playing"
              style={[
                styles.nowPlayingCard,
                isPlaying && {
                  borderColor: c.teal + '60',
                  ...Theme.shadows.glow,
                },
              ]}
            >
              <LinearGradient
                colors={isPlaying ? c.gradientNextPrayer : c.gradientPaused}
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
                      <ActivityIndicator size="small" color="#FFFFFF" />
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
                  ⚠️ Audio isn't available in this preview. Install the app to listen.
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
              accessibilityRole="button"
              accessibilityState={{ selected: activeCategory === cat.key }}
              accessibilityLabel={`${cat.label} stations`}
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
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${station.name}, ${station.reciter}`}
                accessibilityHint={isStationPlaying ? 'Stops playback' : 'Plays this recitation'}
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
                    <FontAwesome name="play-circle" size={28} color={c.teal + '80'} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Footer credit */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by mp3quran.net • Free Quran Recitations
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: Theme.spacing.smd },
  title: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.heavy,
    color: c.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: c.textSecondary,
  },

  // Now Playing
  nowPlayingSection: { paddingHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm },
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
    marginBottom: Theme.spacing.xs,
  },
  nowPlayingName: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: c.onAccent,
    marginBottom: 2,
  },
  nowPlayingReciter: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  mainPlayButton: { marginLeft: Theme.spacing.sm },
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
    marginTop: Theme.spacing.sm,
    padding: 10,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: c.warning + '15',
    borderWidth: 1,
    borderColor: c.warning + '25',
  },
  audioNoticeText: {
    fontSize: Theme.fontSize.xs,
    color: c.warning,
    textAlign: 'center',
    fontWeight: Theme.fontWeight.medium,
  },

  // Category tabs
  categoryBar: {
    flexDirection: 'row',
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.smd,
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
  },
  categoryTabActive: {
    backgroundColor: c.cardHighlight,
    borderWidth: 1,
    borderColor: c.gold + '30',
  },
  categoryEmoji: { fontSize: Theme.fontSize.body, marginBottom: 2 },
  categoryLabel: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: Theme.fontWeight.medium,
  },
  categoryLabelActive: {
    color: c.goldText,
    fontWeight: Theme.fontWeight.bold,
  },

  // Count row
  countRow: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  countText: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    fontWeight: Theme.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Station list
  stationList: { paddingHorizontal: Theme.spacing.lg },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 14,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    gap: Theme.spacing.smd,
  },
  stationCardActive: {
    borderColor: c.teal + '40',
    backgroundColor: c.teal + '06',
  },
  stationCardPressed: {
    backgroundColor: c.cardHighlight,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.teal + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationIconPlaying: {
    backgroundColor: c.teal + '22',
  },
  stationIconText: { fontSize: Theme.fontSize.mlg },
  stationInfo: { flex: 1 },
  stationName: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.semibold,
    color: c.textPrimary,
    marginBottom: 2,
  },
  stationNamePlaying: {
    color: c.teal,
  },
  stationReciter: {
    fontSize: Theme.fontSize.sm,
    color: c.textSecondary,
  },
  stationAction: {
    width: 36,
    alignItems: 'center',
  },

  // Live indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: c.danger + '15',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.danger,
  },
  liveText: {
    fontSize: 9,
    fontWeight: Theme.fontWeight.bold,
    color: c.danger,
    letterSpacing: 1,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.mlg,
    paddingHorizontal: Theme.spacing.mlg,
  },
  footerText: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    textAlign: 'center',
  },
});
