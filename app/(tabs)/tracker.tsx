import { SHARE_FOOTER } from '@/constants/storeLinks';
import { PRAYER_CONFIG, Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { getNextAchievement, getUnlockedAchievements, TIER_COLORS } from '@/data/achievements';
import { useT } from '@/i18n/I18nContext';
import { onStreakMilestone } from '@/services/reviewPromptService';
import {
    DayLog,
    getDayLog,
    getStreak,
    getWeekLog,
    PrayerStatus,
    setPrayerStatus,
} from '@/services/storageService';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    Share,
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

const statusLabelKey: Record<string, 'tracker_status_prayed' | 'tracker_status_missed' | 'tracker_status_qada'> = {
  prayed: 'tracker_status_prayed',
  missed: 'tracker_status_missed',
  qada: 'tracker_status_qada',
};

export default function TrackerScreen() {
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const t = useT();
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
    // Trigger a native review prompt on streak milestones (7/30/100 days).
    // The service enforces its own frequency caps.
    if (s > streak) {
      onStreakMilestone(s);
    }
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

  /**
   * Share a beautifully formatted streak card. Every share is a free install
   * impression — the message includes both store links (via SHARE_FOOTER).
   */
  const shareStreak = async () => {
    const title =
      streak >= 100 ? '💎 100+ days of consistent salah! 💎' :
      streak >= 30  ? '🌟 30+ day streak — alhamdulillah!' :
      streak >= 7   ? '🔥 7-day prayer streak!' :
      `Tracking my salah — day ${streak}`;

    const body = streak > 0
      ? `${title}\n\nI've prayed all 5 daily salah for ${streak} day${streak === 1 ? '' : 's'} in a row, using Azan Time.\n\nMay Allah accept. 🤲`
      : `I'm tracking my daily salah with Azan Time. Join me in building the habit, insha'Allah. 🤲`;

    try {
      await Share.share({ message: body + SHARE_FOOTER });
    } catch {
      // user cancelled
    }
  };

  const todayPrayed = TRACKER_PRAYERS.filter((p) => dayLog[p] === 'prayed').length;
  const todayTotal = TRACKER_PRAYERS.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={[c.background, c.surfaceDark]} style={styles.header}>
          <Text style={styles.title}>{t('tracker_title_emoji')}</Text>
          <Text style={styles.subtitle}>{t('tracker_subtitle')}</Text>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>{t('tracker_day_streak')}</Text>
          </LinearGradient>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{todayPrayed}/{todayTotal}</Text>
            <Text style={styles.statLabel}>{t('tracker_today')}</Text>
          </LinearGradient>
          <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.statCard}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={styles.statValue}>{today.toLocaleDateString('en', { weekday: 'short' })}</Text>
            <Text style={styles.statLabel}>{today.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</Text>
          </LinearGradient>
        </View>

        {/* Today's Prayers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tracker_todays_prayers')}</Text>
          <Text style={styles.sectionHint}>{t('tracker_tap_hint_emoji')}</Text>

          {TRACKER_PRAYERS.map((prayer) => {
            const config = PRAYER_CONFIG[prayer];
            const status = dayLog[prayer];
            return (
              <Pressable
                key={prayer}
                testID={`tracker-prayer-${prayer}`}
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
                        status === 'prayed' && { color: c.emerald },
                        status === 'missed' && { color: c.danger },
                        status === 'qada' && { color: c.warning },
                      ]}>{t(statusLabelKey[status])}</Text>
                    </View>
                  ) : (
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>{t('tracker_log')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Week Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tracker_this_week')}</Text>
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

        {/* Motivational + share */}
        {streak > 0 && (
          <View style={styles.motivationCard}>
            <Text style={{ fontSize: 28 }}>
              {streak >= 100 ? '💎' : streak >= 30 ? '🌟' : streak >= 7 ? '🔥' : '🤲'}
            </Text>
            <Text style={styles.motivationText}>
              {streak >= 100 ? t('tracker_motivation_100') :
               streak >= 30  ? t('tracker_motivation_30') :
               streak >= 7   ? t('tracker_motivation_7') :
               streak >= 3   ? t('tracker_motivation_3') :
                               t('tracker_motivation_started')}
            </Text>
            <Pressable style={styles.streakShareBtn} onPress={shareStreak} hitSlop={8}>
              <FontAwesome name="share-alt" size={14} color={c.goldDark} />
            </Pressable>
          </View>
        )}

        {/* Don't-break-the-chain — visualize the last 14 days */}
        {streak >= 3 && (
          <View style={styles.chainSection}>
            <View style={styles.chainHeader}>
              <Text style={styles.chainTitle}>{t('tracker_dont_break_chain_emoji')}</Text>
              <Pressable onPress={shareStreak} hitSlop={10} style={styles.chainShareLink}>
                <FontAwesome name="share-alt" size={12} color={c.teal} />
                <Text style={styles.chainShareText}>{t('tracker_share_streak')}</Text>
              </Pressable>
            </View>
            <View style={styles.chainRow}>
              {Array.from({ length: 14 }).map((_, i) => {
                // Last 14 days, most recent rightmost
                const dayOffset = 13 - i;
                const isLit = dayOffset < streak;
                return (
                  <View
                    key={i}
                    style={[
                      styles.chainLink,
                      isLit && styles.chainLinkLit,
                    ]}
                  >
                    <Text style={styles.chainLinkText}>{isLit ? '🔥' : '·'}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.chainFooter}>
              {streak >= 14
                ? t('tracker_chain_counting', { count: streak })
                : t('tracker_chain_day_of', { count: streak })}
            </Text>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('tracker_achievements_emoji')}</Text>
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
                <Text style={styles.noAchievementsText}>{t('tracker_unlock_badges')}</Text>
              </View>
            )}
          </View>
          {(() => {
            const next = getNextAchievement(streak);
            if (!next) return null;
            const progress = Math.min(streak / next.requirement, 1);
            return (
              <View style={styles.nextAchievement}>
                <Text style={styles.nextAchievementLabel}>{t('tracker_next_achievement', { emoji: next.emoji, title: next.title, current: streak, requirement: next.requirement })}</Text>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: c.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Theme.fontSize.sm, color: c.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 8, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: Theme.borderRadius.lg,
    borderWidth: 1, borderColor: c.cardBorder,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: '#FFFFFF' },
  statLabel: { fontSize: Theme.fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.bold,
    color: c.textMuted, letterSpacing: 2, marginBottom: 8, paddingLeft: 4,
  },
  sectionHint: { fontSize: 11, color: c.textMuted, marginBottom: 12, paddingLeft: 4 },

  // Prayer rows
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: 16, marginBottom: 8, borderWidth: 1, borderColor: c.cardBorder,
  },
  prayerRowPrayed: { borderColor: c.emerald + '40', backgroundColor: c.emerald + '08' },
  prayerRowMissed: { borderColor: c.danger + '30', backgroundColor: c.danger + '08' },
  prayerRowPressed: { opacity: 0.8 },
  prayerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  prayerRowEmoji: { fontSize: 22 },
  prayerRowName: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.semibold, color: c.textPrimary },
  prayerRowRight: {},
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusEmoji: { fontSize: 16 },
  statusText: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold },
  tapHint: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: Theme.borderRadius.full,
    backgroundColor: c.textMuted + '20', borderWidth: 1, borderColor: c.textMuted + '30',
  },
  tapHintText: { fontSize: Theme.fontSize.xs, color: c.textMuted, fontWeight: Theme.fontWeight.medium },

  // Heatmap
  heatmapContainer: {
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: c.cardBorder,
  },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  heatmapLabelCell: { width: 28, alignItems: 'center' },
  heatmapLabel: { fontSize: 14 },
  heatmapHeaderCell: { flex: 1, alignItems: 'center' },
  heatmapHeaderText: { fontSize: 10, color: c.textMuted, fontWeight: Theme.fontWeight.semibold },
  heatmapCell: {
    flex: 1, height: 30, borderRadius: 6, backgroundColor: c.surfaceDark,
    justifyContent: 'center', alignItems: 'center',
  },
  heatmapPrayed: { backgroundColor: c.emerald + '25' },
  heatmapMissed: { backgroundColor: c.danger + '20' },
  heatmapQada: { backgroundColor: c.warning + '20' },
  heatmapCellText: { fontSize: 12 },

  // Motivation
  motivationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20,
    backgroundColor: c.gold + '10', borderRadius: Theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: c.gold + '20',
  },
  motivationText: { fontSize: Theme.fontSize.sm, color: c.goldDark, flex: 1, fontWeight: Theme.fontWeight.medium },
  streakShareBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.gold + '18',
    justifyContent: 'center', alignItems: 'center',
  },

  // Don't-break-the-chain visualization
  chainSection: {
    marginHorizontal: 20, marginTop: 16, marginBottom: 8,
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: c.cardBorder,
  },
  chainHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  chainTitle: {
    fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold,
    color: c.textPrimary,
  },
  chainShareLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.teal + '12',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  chainShareText: {
    fontSize: Theme.fontSize.xs, color: c.teal,
    fontWeight: Theme.fontWeight.semibold,
  },
  chainRow: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  chainLink: {
    flex: 1, aspectRatio: 1, borderRadius: 6,
    backgroundColor: c.surfaceDark,
    justifyContent: 'center', alignItems: 'center',
  },
  chainLinkLit: {
    backgroundColor: c.gold + '25',
    borderWidth: 1, borderColor: c.gold + '40',
  },
  chainLinkText: { fontSize: 12 },
  chainFooter: {
    fontSize: Theme.fontSize.xs, color: c.textMuted,
    textAlign: 'center', marginTop: 10,
  },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementBadge: { width: '47%', borderRadius: Theme.borderRadius.lg, padding: 14, borderWidth: 1.5, alignItems: 'center' },
  achievementEmoji: { fontSize: 28, marginBottom: 6 },
  achievementTitle: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold, textAlign: 'center' },
  achievementDesc: { fontSize: Theme.fontSize.xs, color: c.textMuted, textAlign: 'center', marginTop: 2 },
  noAchievements: { width: '100%', alignItems: 'center', padding: 24, backgroundColor: c.card, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: c.cardBorder },
  noAchievementsText: { fontSize: Theme.fontSize.sm, color: c.textMuted, marginTop: 8 },
  nextAchievement: { marginTop: 14 },
  nextAchievementLabel: { fontSize: Theme.fontSize.sm, color: c.textSecondary, marginBottom: 8, fontWeight: Theme.fontWeight.medium },
  progressBarBg: { height: 8, backgroundColor: c.surfaceDark, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: c.gold, borderRadius: 4 },
});
