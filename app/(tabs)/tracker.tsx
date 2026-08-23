import { SHARE_FOOTER } from '@/constants/storeLinks';
import { PRAYER_CONFIG, Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { getNextAchievement, getUnlockedAchievements, TIER_COLORS } from '@/data/achievements';
import { maybeShowInterstitial } from '@/services/adsService';
import { onPrayerLogged, onStreakMilestone, onTrackerDayComplete } from '@/services/reviewPromptService';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const insets = useSafeAreaInsets();
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

    // A genuine completion moment: this tap marks the LAST remaining prayer of
    // the day as prayed (all five now ✅). That's a natural, earned transition —
    // an appropriate, policy-safe surface for the frequency-capped interstitial.
    // The service enforces the ≥4-min / ≤5-per-day caps, so this never stacks
    // with an azan-finish ad. Only true when we're setting THIS prayer to
    // 'prayed' and the other four are already 'prayed'.
    const completesTheDay =
      nextStatus === 'prayed' &&
      TRACKER_PRAYERS.every((p) => p === prayer || dayLog[p] === 'prayed');

    await setPrayerStatus(today, prayer, nextStatus);
    await loadData();

    if (completesTheDay) {
      // Completing all five prayers is the app's strongest delight moment, so
      // it feeds the review prompt too. Whichever surface shows, only ONE
      // shows: if the review request reached Play we skip the interstitial,
      // so the user is never handed an ad and a rating dialog on one tap.
      const prompted = await onTrackerDayComplete();
      if (!prompted) maybeShowInterstitial();
    } else if (nextStatus === 'prayed') {
      // Logging ANY prayer is the app's core loop and its cheapest genuine
      // success moment — up to five a day for an engaged user. This is what
      // brings Azan's reachability in line with Mentalism's "any completed
      // drill"; before it, the floor was three fully-tracked days. Only
      // 'prayed' qualifies: prompting straight after someone logs a MISSED
      // prayer would be tone-deaf. No ad on this branch, so nothing to stack.
      void onPrayerLogged();
    }
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
        <LinearGradient colors={[c.background, c.surfaceDark]} style={[styles.header, { paddingTop: insets.top + Theme.spacing.smd }]}>
          <Text style={styles.title}>📊 Prayer Tracker</Text>
          <Text style={styles.subtitle}>Track your daily prayers</Text>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <LinearGradient colors={c.gradientNextPrayer} style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </LinearGradient>
          <LinearGradient colors={c.gradientNextPrayer} style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{todayPrayed}/{todayTotal}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </LinearGradient>
          <LinearGradient colors={c.gradientNextPrayer} style={styles.statCard}>
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
                testID={`tracker-prayer-${prayer}`}
                style={({ pressed }) => [
                  styles.prayerRow,
                  status === 'prayed' && styles.prayerRowPrayed,
                  status === 'missed' && styles.prayerRowMissed,
                  pressed && styles.prayerRowPressed,
                ]}
                onPress={() => cyclePrayerStatus(prayer)}
                accessibilityRole="button"
                accessibilityLabel={`${config.name}${status ? `, ${statusLabel[status]}` : ', not logged'}`}
                accessibilityHint="Cycles through prayed, missed, qada, and reset"
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
                      ]}>{statusLabel[status]}</Text>
                    </View>
                  ) : (
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>Log</Text>
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

        {/* Motivational + share */}
        {streak > 0 && (
          <View style={styles.motivationCard}>
            <Text style={{ fontSize: Theme.fontSize.xxl }}>
              {streak >= 100 ? '💎' : streak >= 30 ? '🌟' : streak >= 7 ? '🔥' : '🤲'}
            </Text>
            <Text style={styles.motivationText}>
              {streak >= 100 ? "100+ days! May Allah bless your consistency 💎" :
               streak >= 30  ? "30+ days — alhamdulillah! Keep going 🌟" :
               streak >= 7   ? "7-day streak! Don't break the chain 🔥" :
               streak >= 3   ? "Great progress! Stay consistent 💪" :
                               "You've started — keep it up 🤲"}
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
              <Text style={styles.chainTitle}>🔥 Don't break the chain</Text>
              <Pressable onPress={shareStreak} hitSlop={10} style={styles.chainShareLink}>
                <FontAwesome name="share-alt" size={12} color={c.teal} />
                <Text style={styles.chainShareText}>Share streak</Text>
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
              {streak >= 14 ? `${streak} days and counting` : `Day ${streak} of your streak`}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: Theme.spacing.md },
  title: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: c.textPrimary, marginBottom: Theme.spacing.xs },
  subtitle: { fontSize: Theme.fontSize.sm, color: c.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: Theme.spacing.lg, gap: 10, marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.mlg },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: Theme.spacing.md, borderRadius: Theme.borderRadius.lg,
    borderWidth: 1, borderColor: c.cardBorder,
  },
  statEmoji: { fontSize: Theme.fontSize.xl, marginBottom: Theme.spacing.xs },
  statValue: { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.heavy, color: c.onAccent },
  statLabel: { fontSize: Theme.fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Sections
  section: { paddingHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.lg },
  sectionTitle: {
    fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.bold,
    color: c.textMuted, letterSpacing: 2, marginBottom: Theme.spacing.sm, paddingLeft: Theme.spacing.xs,
  },
  sectionHint: { fontSize: Theme.fontSize.xs, color: c.textMuted, marginBottom: Theme.spacing.smd, paddingLeft: Theme.spacing.xs },

  // Prayer rows
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md, marginBottom: Theme.spacing.sm, borderWidth: 1, borderColor: c.cardBorder,
  },
  prayerRowPrayed: { borderColor: c.emerald + '40', backgroundColor: c.emerald + '08' },
  prayerRowMissed: { borderColor: c.danger + '30', backgroundColor: c.danger + '08' },
  prayerRowPressed: { opacity: 0.8 },
  prayerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  prayerRowEmoji: { fontSize: Theme.fontSize.xl },
  prayerRowName: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.semibold, color: c.textPrimary },
  prayerRowRight: {},
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusEmoji: { fontSize: Theme.fontSize.body },
  statusText: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold },
  tapHint: {
    paddingHorizontal: Theme.spacing.md, paddingVertical: 6, borderRadius: Theme.borderRadius.full,
    backgroundColor: c.textMuted + '20', borderWidth: 1, borderColor: c.textMuted + '30',
  },
  tapHintText: { fontSize: Theme.fontSize.xs, color: c.textMuted, fontWeight: Theme.fontWeight.medium },

  // Heatmap
  heatmapContainer: {
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md, borderWidth: 1, borderColor: c.cardBorder,
  },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs, marginBottom: Theme.spacing.xs },
  heatmapLabelCell: { width: 28, alignItems: 'center' },
  heatmapLabel: { fontSize: Theme.fontSize.md },
  heatmapHeaderCell: { flex: 1, alignItems: 'center' },
  heatmapHeaderText: { fontSize: 10, color: c.textMuted, fontWeight: Theme.fontWeight.semibold },
  heatmapCell: {
    flex: 1, height: 30, borderRadius: 6, backgroundColor: c.surfaceDark,
    justifyContent: 'center', alignItems: 'center',
  },
  heatmapPrayed: { backgroundColor: c.emerald + '25' },
  heatmapMissed: { backgroundColor: c.danger + '20' },
  heatmapQada: { backgroundColor: c.warning + '20' },
  heatmapCellText: { fontSize: Theme.fontSize.sm },

  // Motivation
  motivationCard: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.smd, marginHorizontal: Theme.spacing.lg,
    backgroundColor: c.gold + '10', borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md, borderWidth: 1, borderColor: c.gold + '20',
  },
  motivationText: { fontSize: Theme.fontSize.sm, color: c.goldText, flex: 1, fontWeight: Theme.fontWeight.medium },
  streakShareBtn: {
    width: 32, height: 32, borderRadius: Theme.borderRadius.lg,
    backgroundColor: c.gold + '18',
    justifyContent: 'center', alignItems: 'center',
  },

  // Don't-break-the-chain visualization
  chainSection: {
    marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm,
    backgroundColor: c.card, borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md, borderWidth: 1, borderColor: c.cardBorder,
  },
  chainHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Theme.spacing.smd,
  },
  chainTitle: {
    fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semibold,
    color: c.textPrimary,
  },
  chainShareLink: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs,
    backgroundColor: c.teal + '12',
    paddingHorizontal: 10, paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  chainShareText: {
    fontSize: Theme.fontSize.xs, color: c.teal,
    fontWeight: Theme.fontWeight.semibold,
  },
  chainRow: { flexDirection: 'row', gap: Theme.spacing.xs, justifyContent: 'space-between' },
  chainLink: {
    flex: 1, aspectRatio: 1, borderRadius: 6,
    backgroundColor: c.surfaceDark,
    justifyContent: 'center', alignItems: 'center',
  },
  chainLinkLit: {
    backgroundColor: c.gold + '25',
    borderWidth: 1, borderColor: c.gold + '40',
  },
  chainLinkText: { fontSize: Theme.fontSize.sm },
  chainFooter: {
    fontSize: Theme.fontSize.xs, color: c.textMuted,
    textAlign: 'center', marginTop: 10,
  },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementBadge: { width: '47%', borderRadius: Theme.borderRadius.lg, padding: 14, borderWidth: 1.5, alignItems: 'center' },
  achievementEmoji: { fontSize: Theme.fontSize.xxl, marginBottom: 6 },
  achievementTitle: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold, textAlign: 'center' },
  achievementDesc: { fontSize: Theme.fontSize.xs, color: c.textMuted, textAlign: 'center', marginTop: 2 },
  noAchievements: { width: '100%', alignItems: 'center', padding: Theme.spacing.lg, backgroundColor: c.card, borderRadius: Theme.borderRadius.lg, borderWidth: 1, borderColor: c.cardBorder },
  noAchievementsText: { fontSize: Theme.fontSize.sm, color: c.textMuted, marginTop: Theme.spacing.sm },
  nextAchievement: { marginTop: 14 },
  nextAchievementLabel: { fontSize: Theme.fontSize.sm, color: c.textSecondary, marginBottom: Theme.spacing.sm, fontWeight: Theme.fontWeight.medium },
  progressBarBg: { height: 8, backgroundColor: c.surfaceDark, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: c.gold, borderRadius: 4 },
});
