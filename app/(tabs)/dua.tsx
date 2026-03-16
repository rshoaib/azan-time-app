import { Theme } from '@/constants/theme';
import { DAILY_DUAS, DuaItem, EVENING_ADHKAR, MORNING_ADHKAR, TASBIH_TYPES } from '@/data/duas';
import { isDuaPlaying, playDuaAudio, stopDuaAudio } from '@/services/duaAudioService';
import { getTasbihCount, setTasbihCount } from '@/services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    Vibration,
    View,
} from 'react-native';

type DuaTab = 'morning' | 'evening' | 'daily' | 'tasbih';

export default function DuaScreen() {
  const [activeTab, setActiveTab] = useState<DuaTab>('morning');
  const [tasbihCount, setTasbihCountState] = useState(0);
  const [tasbihType, setTasbihType] = useState(0);

  useFocusEffect(useCallback(() => {
    loadTasbih();
  }, []));

  const loadTasbih = async () => {
    const c = await getTasbihCount();
    setTasbihCountState(c);
  };

  const handleTasbihTap = async () => {
    const newCount = tasbihCount + 1;
    setTasbihCountState(newCount);
    await setTasbihCount(newCount);
    Vibration.vibrate(15);
  };

  const resetTasbih = async () => {
    setTasbihCountState(0);
    await setTasbihCount(0);
    Vibration.vibrate(30);
  };

  const tabs: { key: DuaTab; label: string; emoji: string }[] = [
    { key: 'morning', label: 'Morning', emoji: '🌅' },
    { key: 'evening', label: 'Evening', emoji: '🌙' },
    { key: 'daily', label: 'Daily', emoji: '📖' },
    { key: 'tasbih', label: 'Tasbih', emoji: '📿' },
  ];

  const currentDuas =
    activeTab === 'morning' ? MORNING_ADHKAR :
    activeTab === 'evening' ? EVENING_ADHKAR :
    activeTab === 'daily' ? DAILY_DUAS : [];

  const currentTasbih = TASBIH_TYPES[tasbihType];
  const tasbihProgress = currentTasbih ? (tasbihCount / currentTasbih.target) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#F5F6FA', '#EEF0F6']} style={styles.header}>
          <Text style={styles.title}>📿 Dua & Dhikr</Text>
          <Text style={styles.subtitle}>Daily remembrance of Allah</Text>
        </LinearGradient>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tasbih Counter */}
        {activeTab === 'tasbih' ? (
          <View style={styles.tasbihContainer}>
            {/* Tasbih Type Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tasbihTypeScroll}>
              <View style={styles.tasbihTypeRow}>
                {TASBIH_TYPES.map((t, i) => (
                  <Pressable
                    key={i}
                    style={[styles.tasbihTypeChip, tasbihType === i && styles.tasbihTypeChipActive]}
                    onPress={() => { setTasbihType(i); resetTasbih(); }}
                  >
                    <Text style={[styles.tasbihTypeText, tasbihType === i && styles.tasbihTypeTextActive]}>
                      {t.translation.split(' (')[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Counter circle */}
            <Pressable onPress={handleTasbihTap} style={styles.tasbihTapArea}>
              <View style={styles.tasbihOuter}>
                <LinearGradient
                  colors={['#0D9488', '#0F766E']}
                  style={styles.tasbihCircle}
                >
                  <Text style={styles.tasbihArabic}>{currentTasbih.label}</Text>
                  <Text style={styles.tasbihCountText}>{tasbihCount}</Text>
                  <Text style={styles.tasbihTarget}>of {currentTasbih.target}</Text>
                </LinearGradient>
              </View>
            </Pressable>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, tasbihProgress)}%` }]} />
            </View>
            <Text style={styles.tasbihTranslation}>{currentTasbih.translation}</Text>

            {/* Reset */}
            <Pressable onPress={resetTasbih} style={styles.resetButton}>
              <Text style={styles.resetText}>🔄 Reset Counter</Text>
            </Pressable>
          </View>
        ) : (
          /* Dua Cards */
          <View style={styles.duaList}>
            {currentDuas.map((dua) => (
              <DuaCard key={dua.id} dua={dua} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DuaCard({ dua }: { dua: DuaItem }) {
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDuaPlaying(dua.id)) {
        stopDuaAudio();
      }
    };
  }, []);

  const toggleAudio = async () => {
    if (isPlaying) {
      await stopDuaAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await playDuaAudio(dua.id, dua.arabic, () => setIsPlaying(false));
    }
  };

  return (
    <Pressable
      style={[styles.duaCard, expanded && styles.duaCardExpanded]}
      onPress={() => setExpanded(!expanded)}
    >
      {dua.occasion && (
        <View style={styles.occasionBadge}>
          <Text style={styles.occasionText}>{dua.occasion}</Text>
        </View>
      )}
      <Text style={styles.duaArabic}>{dua.arabic}</Text>
      {expanded && (
        <>
          <Text style={styles.duaTransliteration}>{dua.transliteration}</Text>
          <View style={styles.duaDivider} />
          <Text style={styles.duaTranslation}>{dua.translation}</Text>
        </>
      )}
      <View style={styles.duaFooter}>
        <View style={styles.footerLeft}>
          <Pressable
            onPress={(e) => { e.stopPropagation(); toggleAudio(); }}
            style={[styles.audioButton, isPlaying && styles.audioButtonActive]}
            hitSlop={8}
          >
            <Animated.Text style={[styles.audioIcon, { opacity: isPlaying ? pulseAnim : 1 }]}>
              {isPlaying ? '⏹️' : '🔊'}
            </Animated.Text>
            <Text style={[styles.audioLabel, isPlaying && styles.audioLabelActive]}>
              {isPlaying ? 'Stop' : 'Listen'}
            </Text>
          </Pressable>
          {dua.repeat > 1 && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatText}>×{dua.repeat}</Text>
            </View>
          )}
        </View>
        <Text style={styles.tapToExpand}>{expanded ? '▲ Less' : '▼ Tap for translation'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: Theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary },

  // Tabs
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 20,
    backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg,
    padding: 4, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: Theme.colors.cardHighlight, borderWidth: 1, borderColor: Theme.colors.gold + '30',
  },
  tabEmoji: { fontSize: 16, marginBottom: 2 },
  tabLabel: { fontSize: 11, color: Theme.colors.textMuted, fontWeight: Theme.fontWeight.medium },
  tabLabelActive: { color: Theme.colors.gold, fontWeight: Theme.fontWeight.bold },

  // Dua cards
  duaList: { paddingHorizontal: 20 },
  duaCard: {
    backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  duaCardExpanded: { borderColor: Theme.colors.gold + '30' },
  occasionBadge: {
    alignSelf: 'flex-start', backgroundColor: Theme.colors.gold + '15',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: Theme.borderRadius.full,
    marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.gold + '20',
  },
  occasionText: { fontSize: 11, color: Theme.colors.gold, fontWeight: Theme.fontWeight.semibold },
  duaArabic: {
    fontSize: 22, color: Theme.colors.textPrimary, textAlign: 'right',
    lineHeight: 38, fontWeight: Theme.fontWeight.medium, marginBottom: 8,
  },
  duaTransliteration: {
    fontSize: Theme.fontSize.sm, color: Theme.colors.teal, fontStyle: 'italic',
    marginBottom: 8, lineHeight: 20,
  },
  duaDivider: { height: 1, backgroundColor: Theme.colors.cardBorder, marginVertical: 8 },
  duaTranslation: {
    fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary, lineHeight: 20,
  },
  duaFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  repeatBadge: {
    backgroundColor: Theme.colors.isha + '20', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
  },
  repeatText: { fontSize: 11, color: Theme.colors.isha, fontWeight: Theme.fontWeight.bold },
  tapToExpand: { fontSize: 11, color: Theme.colors.textMuted },

  // Audio button
  footerLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  audioButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.teal + '12', borderWidth: 1, borderColor: Theme.colors.teal + '25',
  },
  audioButtonActive: {
    backgroundColor: Theme.colors.danger + '12', borderColor: Theme.colors.danger + '25',
  },
  audioIcon: { fontSize: 14 },
  audioLabel: { fontSize: 11, color: Theme.colors.teal, fontWeight: Theme.fontWeight.semibold },
  audioLabelActive: { color: Theme.colors.danger },

  // Tasbih
  tasbihContainer: { alignItems: 'center', paddingHorizontal: 20 },
  tasbihTypeScroll: { marginBottom: 24 },
  tasbihTypeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  tasbihTypeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  tasbihTypeChipActive: {
    backgroundColor: Theme.colors.gold + '15', borderColor: Theme.colors.gold + '40',
  },
  tasbihTypeText: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: Theme.fontWeight.medium },
  tasbihTypeTextActive: { color: Theme.colors.gold, fontWeight: Theme.fontWeight.bold },
  tasbihTapArea: { marginBottom: 20 },
  tasbihOuter: {
    width: 220, height: 220, borderRadius: 110,
    borderWidth: 3, borderColor: Theme.colors.gold + '25',
    justifyContent: 'center', alignItems: 'center',
  },
  tasbihCircle: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  tasbihArabic: { fontSize: 22, color: Theme.colors.gold, marginBottom: 8 },
  tasbihCountText: { fontSize: 52, fontWeight: Theme.fontWeight.heavy, color: '#FFFFFF' },
  tasbihTarget: { fontSize: Theme.fontSize.sm, color: Theme.colors.textMuted, marginTop: 4 },
  progressBarBg: {
    width: '80%', height: 6, borderRadius: 3,
    backgroundColor: Theme.colors.cardBorder, marginBottom: 12, overflow: 'hidden',
  },
  progressBarFill: {
    height: 6, borderRadius: 3, backgroundColor: Theme.colors.gold,
  },
  tasbihTranslation: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  resetButton: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  resetText: { fontSize: Theme.fontSize.sm, color: Theme.colors.textMuted, fontWeight: Theme.fontWeight.medium },
});
