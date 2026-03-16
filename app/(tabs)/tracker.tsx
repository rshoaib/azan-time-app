import { PRAYER_CONFIG, Theme } from '@/constants/theme';
import { getNextAchievement, getUnlockedAchievements, TIER_COLORS } from '@/data/achievements';
import {
    DayLog,
    getDayLog,
    getStreak,
    getWeekLog,
    PrayerStatus,
    setPrayerStatus,
} from '@/services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type TrackerPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
const TRACKER_PRAYERS: TrackerPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const statusEmoji: Record<string, string> = {
  prayed: '✅',
  missed: '❌',
  qada: '🔄',
};

const statusLabel: Record<string, string> = {
  prayed: 'Prayed',
  missed: 'Missed',
  qada: 'Qada',
};

export default function TrackerScreen() {
  const [today, setToday] = useState(new Date());
  const [dayLog, setDayLog] = useState<DayLog>({ fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null });
  const [weekLog, setWeekLog] = useState<{ date: Date; log: DayLog }[]>([]);
  const [streak, setStreak] = useState(0);

  const loadData = async () => {
    const now = new Date();
    setToday(now);
    const [log, week, s] = await Promise.all([getDayLog(now), getWeekLog(), getStreak()]);
    setDayLog(log);
    setWeekLog(week);
    setStreak(s);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  useEffect(() => { loadData(); }, []);

  const cyclePrayerStatus = async (prayer: TrackerPrayer) => {
    const current = dayLog[prayer];
    const nextStatus: PrayerStatus =
      current === null ? 'prayed' :
      current === 'prayed' ? 'missed' :
      current === 'missed' ? 'qada' :
      null;
    await setPrayerStatus(today, prayer, nextStatus);
    await loadData();
  };

  const todayPrayed = TRACKER_PRAYERS.filter((p) => dayLog[p] === 'prayed').length;
  const todayTotal = TRACKER_PRAYERS.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#F5F6FA', '#EEF0F6']} style={styles.header}>
          <Text style={styles.title}>📊 Prayer Tracker</Text>
          <Text style={styles.subtitle}>Track your daily prayers</Text>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </LinearGradient>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{todayPrayed}/{todayTotal}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </LinearGradient>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={styles.statValue}>{today.toLocaleDateString('en', { weekday: 'short' })}</Text>
            <Text style={styles.statLabel}>{today.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</Text>
          </LinearGradient>
        </View>

        {/* Today's Prayers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S PRAYERS</Text>
          <Text style={styles.sectionHint}>Tap to cycle: ✅ Prayed → ❌ Missed → 🔄 Qada → ⬜ Reset</Text>

          {TRACKER_PRAYERS.map((prayer) => {
            const config = PRAYER_CONFIG[prayer];
            const status = dayLog[prayer];
            return (
              <Pressable
                key={prayer}
                style={({ pressed }) => [
                  styles.prayerRow,
                  status === 'prayed' && styles.prayerRowPrayed,
                  status === 'missed' && styles.prayerRowMissed,
                  pressed && styles.prayerRowPressed,
                ]}
                onPress={() => cyclePrayerStatus(prayer)}
              >
                <View style={styles.prayerRowLeft}>
                  <Text style={styles.prayerRowEmoji}>{config.emoji}</Text>
                  <Text style={styles.prayerRowName}>{config.name}</Text>
                </View>
                <View style={styles.prayerRowRight}>
                  {status ? (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusEmoji}>{statusEmoji[status]}</Text>
                      <Text style={[
                        styles.statusText,
                        status === 'prayed' && { color: Theme.colors.emerald },
                        status === 'missed' && { color: Theme.colors.danger },
                        status === 'qada' && { color: Theme.colors.warning },
                      ]}>{statusLabel[status]}</Text>
                    </View>
                  ) : (
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>Tap</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Week Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THIS WEEK</Text>
          <View style={styles.heatmapContainer}>
            {/* Column headers */}
            <View style={styles.heatmapRow}>
              <View style={styles.heatmapLabelCell} />
              {weekLog.map((w, i) => (
                <View key={i} style={styles.heatmapHeaderCell}>
                  <Text style={styles.heatmapHeaderText}>
                    {w.date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                  </Text>
                </View>
              ))}
            </View>
            {/* Prayer rows */}
            {TRACKER_PRAYERS.map((prayer) => (
              <View key={prayer} style={styles.heatmapRow}>
                <View style={styles.heatmapLabelCell}>
                  <Text style={styles.heatmapLabel}>{PRAYER_CONFIG[prayer].emoji}</Text>
                </View>
                {weekLog.map((w, i) => {
                  const s = w.log[prayer];
                  return (
                    <View key={i} style={[
                      styles.heatmapCell,
                      s === 'prayed' && styles.heatmapPrayed,
                      s === 'missed' && styles.heatmapMissed,
                      s === 'qada' && styles.heatmapQada,
                    ]}>
                      {s && <Text style={styles.heatmapCellText}>{statusEmoji[s]}</Text>}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Motivational */}
        {streak > 0 && (
          <View style={styles.motivationCard}>
            <Text style={{ fontSize: 24 }}>🔥</Text>
            <Text style={styles.motivationText}>
              {streak >= 7 ? "Amazing! Keep your streak going! 🌟" :
               streak >= 3 ? "Great progress! Stay consistent! 💪" :
               "You've started — keep it up! 🤲"}
            </Text>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 ACHIEVEMENTS</Text>
          <View style={styles.achievementsGrid}>
            {getUnlockedAchievements(streak).map((a) => {
              const colors = TIER_COLORS[a.tier];
              return (
                <View key={a.id} style={[styles.achievementBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={styles.achievementEmoji}>{a.emoji}</Text>
                  <Text style={[styles.achievementTitle, { color: colors.text }]}>{a.title}</Text>
                  <Text style={styles.achievementDesc}>{a.description}</Text>
                </View>
              );
            })}
            {getUnlockedAchievements(streak).length === 0 && (
              <View style={styles.noAchievements}>
                <Text style={{ fontSize: 32 }}>🔒</Text>
                <Text style={styles.noAchievementsText}>Pray consistently to unlock badges!</Text>
              </View>
            )}
          </View>
          {(() => {
            const next = getNextAchievement(streak);
            if (!next) return null;
            const progress = Math.min(streak / next.requirement, 1);
            return (
              <View style={styles.nextAchievement}>
                <Text style={styles.nextAchievementLabel}>Next: {next.emoji} {next.title} ({streak}/{next.requirement} days)</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            );
          })()}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: Theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 8, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: Theme.borderRadius.lg,
    borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: '#FFFFFF' },
  statLabel: { fontSize: Theme.fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.textMuted, letterSpacing: 2, marginBottom: 8, paddingLeft: 4,
  },
  sectionHint: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 12, paddingLeft: 4 },

  // Prayer rows
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg,
    padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  prayerRowPrayed: { borderColor: Theme.colors.emerald + '40', backgroundColor: Theme.colors.emerald + '08' },
  prayerRowMissed: { borderColor: Theme.colors.danger + '30', backgroundColor: Theme.colors.danger + '08' },
  prayerRowPressed: { opacity: 0.8 },
  prayerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  prayerRowEmoji: { fontSize: 22 },
  prayerRowName: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.semibold, color: Theme.colors.textPrimary },
  prayerRowRight: {},
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusEmoji: { fontSize: 16 },
  statusText: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold },
  tapHint: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.textMuted + '20', borderWidth: 1, borderColor: Theme.colors.textMuted + '30',
  },
  tapHintText: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted, fontWeight: Theme.fontWeight.medium },

  // Heatmap
  heatmapContainer: {
    backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: Theme.colors.cardBorder,
  },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  heatmapLabelCell: { width: 28, alignItems: 'center' },
  heatmapLabel: { fontSize: 14 },
  heatmapHeaderCell: { flex: 1, alignItems: 'center' },
  heatmapHeaderText: { fontSize: 10, color: Theme.colors.textMuted, fontWeight: Theme.fontWeight.semibold },
  heatmapCell: {
    flex: 1, height: 30, borderRadius: 6, backgroundColor: Theme.colors.surfaceDark,
    justifyContent: 'center', alignItems: 'center',
  },
  heatmapPrayed: { backgroundColor: Theme.colors.emerald + '25' },
  heatmapMissed: { backgroundColor: Theme.colors.danger + '20' },
  heatmapQada: { backgroundColor: Theme.colors.warning + '20' },
  heatmapCellText: { fontSize: 12 },

  // Motivation
  motivationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20,
    backgroundColor: Theme.colors.gold + '10', borderRadius: Theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: Theme.colors.gold + '20',
  },
  motivationText: { fontSize: Theme.fontSize.sm, color: Theme.colors.goldDark, flex: 1, fontWeight: Theme.fontWeight.medium },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementBadge: { width: '47%', borderRadius: Theme.borderRadius.lg, padding: 14, borderWidth: 1.5, alignItems: 'center' },
  achievementEmoji: { fontSize: 28, marginBottom: 6 },
  achievementTitle: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold, textAlign: 'center' },
  achievementDesc: { fontSize: Theme.fontSize.xs, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 2 },
  noAchievements: { width: '100%', alignItems: 'center', padding: 24, backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: Theme.colors.cardBorder },
  noAchievementsText: { fontSize: Theme.fontSize.sm, color: Theme.colors.textMuted, marginTop: 8 },
  nextAchievement: { marginTop: 14 },
  nextAchievementLabel: { fontSize: Theme.fontSize.sm, color: Theme.colors.textSecondary, marginBottom: 8, fontWeight: Theme.fontWeight.medium },
  progressBarBg: { height: 8, backgroundColor: Theme.colors.surfaceDark, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Theme.colors.gold, borderRadius: 4 },
});
