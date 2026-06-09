import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Theme, ThemeColors, CALCULATION_METHODS, PRAYER_CONFIG } from '@/constants/theme';
import { RECITERS } from '@/constants/reciters';
import { PrayerName } from '@/services/prayerService';
import {
  getCalculationMethod,
  setCalculationMethod,
  getNotificationEnabled,
  setNotificationEnabled,
  getEnabledPrayers,
  setEnabledPrayers,
  getAdvanceMinutes,
  setAdvanceMinutes,
  getSavedLocation,
  setSavedLocation,
  getAzanSoundEnabled,
  setAzanSoundEnabled,
  getAzanReciter,
  setAzanReciter,
  getAzanShortEnabled,
  setAzanShortEnabled,
  ThemeMode,
} from '@/services/storageService';
import { stopAzan, isAzanPlaying } from '@/services/audioService';
import { getScheduledNotificationCount, fireTestNotification } from '@/services/notificationService';
import { getCurrentLocation } from '@/services/locationService';
import { setUserProperty } from '@/services/analyticsService';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { SettingRow } from '@/components/ui/SettingRow';
import { E2E, e2eSetForceError } from '@/services/e2eConfig';

const ADVANCE_OPTIONS = [
  { value: 0, label: 'At prayer time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
];

export default function SettingsScreen() {
  const [method, setMethod] = useState('MuslimWorldLeague');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [enabledPrayers, setEnabledPrayersState] = useState<Record<PrayerName, boolean>>({
    fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true,
  });
  const [advance, setAdvance] = useState(0);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [azanSoundOn, setAzanSoundOn] = useState(true);
  const [azanShortOn, setAzanShortOn] = useState(false);
  const [reciter, setReciter] = useState('default');
  const [locationInfo, setLocationInfo] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [e2eScheduled, setE2eScheduled] = useState<number | null>(null);
  const [azanPlaying, setAzanPlaying] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  // E2E: poll azan playback state so a test can assert it after firing a notification.
  useEffect(() => {
    if (!E2E) return;
    const id = setInterval(() => setAzanPlaying(isAzanPlaying()), 300);
    return () => clearInterval(id);
  }, []);

  const loadSettings = async () => {
    const m = await getCalculationMethod(); setMethod(m);
    const n = await getNotificationEnabled(); setNotificationsOn(n);
    const e = await getEnabledPrayers(); setEnabledPrayersState(e);
    const a = await getAdvanceMinutes(); setAdvance(a);
    const azanOn = await getAzanSoundEnabled(); setAzanSoundOn(azanOn);
    const short = await getAzanShortEnabled(); setAzanShortOn(short);
    const r = await getAzanReciter(); setReciter(r);
    const loc = await getSavedLocation();
    if (loc) setLocationInfo(`${loc.city}, ${loc.country}`);
    if (E2E) setE2eScheduled(await getScheduledNotificationCount());
  };

  const handleMethodChange = async (key: string) => {
    setMethod(key); await setCalculationMethod(key); setShowMethodModal(false);
    setUserProperty('calculation_method', key);
  };
  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsOn(value); await setNotificationEnabled(value);
  };
  const handlePrayerToggle = async (prayer: PrayerName) => {
    const updated = { ...enabledPrayers, [prayer]: !enabledPrayers[prayer] };
    setEnabledPrayersState(updated); await setEnabledPrayers(updated);
  };
  const handleAdvanceChange = async (value: number) => {
    setAdvance(value); await setAdvanceMinutes(value); setShowAdvanceModal(false);
  };
  const handleAzanSoundToggle = async (value: boolean) => {
    setAzanSoundOn(value); await setAzanSoundEnabled(value);
    if (!value) await stopAzan();
  };
  const handleAzanShortToggle = async (value: boolean) => {
    setAzanShortOn(value); await setAzanShortEnabled(value);
  };
  const handleReciterChange = async (id: string) => {
    setReciter(id); await setAzanReciter(id); setShowReciterModal(false);
    setUserProperty('azan_reciter', id);
  };

  // Explicit, user-driven location refresh. Unlike the home screen's throttled
  // background revalidation, this always re-detects via GPS and saves the result
  // so a traveller can correct their city on demand. The home tab picks up the
  // new saved location the next time it gains focus.
  const handleUpdateLocation = async () => {
    if (updatingLocation) return;
    setUpdatingLocation(true);
    setLocationMsg(null);
    try {
      const fresh = await getCurrentLocation();
      await setSavedLocation(fresh);
      const label = fresh.country ? `${fresh.city}, ${fresh.country}` : fresh.city;
      setLocationInfo(label);
      setLocationMsg({ text: `Updated to ${label}`, ok: true });
    } catch (e: any) {
      setLocationMsg({ text: e?.message || "Couldn't get your location. Check that location is on.", ok: false });
    } finally {
      setUpdatingLocation(false);
    }
  };

  const { mode: themeMode, setMode: setThemeModePref, colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);

  const currentMethodLabel = CALCULATION_METHODS.find((m) => m.key === method)?.label || method;
  const currentAdvanceLabel = ADVANCE_OPTIONS.find((o) => o.value === advance)?.label || `${advance} min before`;
  const currentReciterLabel = RECITERS.find((r) => r.id === reciter)?.name || 'Default';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={[c.background, c.surfaceDark]} style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>Customize your Azan experience</Text>
        </LinearGradient>

        {/* Calculation Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧮 PRAYER CALCULATION</Text>
          <SettingRow
            emoji="📐"
            tint={c.fajr}
            label="Calculation Method"
            value={currentMethodLabel}
            onPress={() => setShowMethodModal(true)}
          />
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌗 APPEARANCE</Text>
          <SettingRow
            emoji="🌗"
            tint={c.isha}
            label="Theme"
            right={
              <View style={styles.segment}>
                {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setThemeModePref(m)}
                    style={[styles.segmentBtn, themeMode === m && styles.segmentBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: themeMode === m }}
                    accessibilityLabel={`${m === 'system' ? 'Auto' : m} theme`}
                  >
                    <Text style={[styles.segmentText, themeMode === m && styles.segmentTextActive]}>
                      {m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'Auto'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            }
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 NOTIFICATIONS</Text>
          {E2E && (
            <>
              <Text testID="e2e-scheduled-count" style={styles.settingValue}>
                E2E scheduled: {e2eScheduled ?? '…'}
              </Text>
              <Text testID="e2e-azan-state" style={styles.settingValue}>
                azan: {azanPlaying ? 'playing' : 'idle'}
              </Text>
              <Pressable testID="e2e-fire-azan" onPress={() => fireTestNotification()}>
                <Text style={styles.settingLabel}>E2E: fire test azan</Text>
              </Pressable>
              <Pressable testID="e2e-force-error" onPress={() => e2eSetForceError()}>
                <Text style={styles.settingLabel}>E2E: force home error</Text>
              </Pressable>
            </>
          )}

          <SettingRow
            emoji="🔔"
            tint={c.emerald}
            label="Enable Notifications"
            right={
              <Switch
                value={notificationsOn}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: c.textMuted + '40', true: c.gold + '50' }}
                thumbColor={notificationsOn ? c.gold : c.switchThumbOff}
              />
            }
          />

          {notificationsOn && (
            <>
              <SettingRow
                emoji="⏰"
                tint={c.teal}
                label="Notify Before"
                value={currentAdvanceLabel}
                onPress={() => setShowAdvanceModal(true)}
              />

              <Text style={styles.subSectionTitle}>Notify for each prayer:</Text>
              {(Object.keys(PRAYER_CONFIG) as PrayerName[]).map((key) => (
                <View key={key} style={styles.prayerToggleCard}>
                  <View style={styles.settingLeft}>
                    <Text style={{ fontSize: Theme.fontSize.body }}>{PRAYER_CONFIG[key].emoji}</Text>
                    <Text style={styles.settingLabel}>{PRAYER_CONFIG[key].name}</Text>
                  </View>
                  <Switch
                    value={enabledPrayers[key]}
                    onValueChange={() => handlePrayerToggle(key)}
                    trackColor={{ false: c.textMuted + '40', true: PRAYER_CONFIG[key].color + '50' }}
                    thumbColor={enabledPrayers[key] ? PRAYER_CONFIG[key].color : c.switchThumbOff}
                  />
                </View>
              ))}
            </>
          )}
        </View>

        {/* Azan Sound */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 AZAN SOUND</Text>
          <SettingRow
            emoji="🎵"
            tint={c.isha}
            label="Play Azan Audio"
            value={azanSoundOn ? 'Plays when prayer time arrives' : 'Notification only'}
            right={
              <Switch
                value={azanSoundOn}
                onValueChange={handleAzanSoundToggle}
                trackColor={{ false: c.textMuted + '40', true: c.gold + '50' }}
                thumbColor={azanSoundOn ? c.gold : c.switchThumbOff}
              />
            }
          />

          {azanSoundOn && (
            <SettingRow
              emoji="⏱️"
              tint={c.teal}
              label="Short Azan"
              value={azanShortOn ? 'Plays a brief adhan' : 'Plays the full adhan'}
              style={{ marginTop: Theme.spacing.sm }}
              right={
                <Switch
                  value={azanShortOn}
                  onValueChange={handleAzanShortToggle}
                  trackColor={{ false: c.textMuted + '40', true: c.gold + '50' }}
                  thumbColor={azanShortOn ? c.gold : c.switchThumbOff}
                />
              }
            />
          )}

          {azanSoundOn && RECITERS.length > 1 && (
            <SettingRow
              emoji="🕌"
              tint={c.gold}
              label="Azan Reciter"
              value={currentReciterLabel}
              style={{ marginTop: Theme.spacing.sm }}
              onPress={() => setShowReciterModal(true)}
            />
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 LOCATION</Text>
          <SettingRow
            testID="settings-update-location"
            emoji="🌍"
            tint={c.sunrise}
            label={updatingLocation ? 'Updating location…' : 'Update Location'}
            value={locationMsg ? locationMsg.text : locationInfo || 'Tap to detect your location'}
            valueStyle={locationMsg ? { color: locationMsg.ok ? c.emerald : c.danger } : undefined}
            onPress={handleUpdateLocation}
            disabled={updatingLocation}
            right={
              updatingLocation ? (
                <ActivityIndicator size="small" color={c.gold} />
              ) : (
                <FontAwesome name="location-arrow" size={16} color={c.gold} />
              )
            }
          />
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ ABOUT</Text>
          <SettingRow
            emoji="🕌"
            tint={c.gold}
            label="Azan Time"
            value={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}
          />
          <View style={[styles.settingCard, { marginTop: Theme.spacing.sm }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: c.fajr + '15' }]}>
                <Text style={{ fontSize: Theme.fontSize.body }}>📖</Text>
              </View>
              <Text style={[styles.settingValue, { flex: 1 }]}>
                Prayer times calculated using the Adhan library with high-precision astronomical algorithms.
              </Text>
            </View>
          </View>
          <SettingRow
            emoji="🔒"
            tint={c.teal}
            label="Privacy Policy"
            style={{ marginTop: Theme.spacing.sm }}
            onPress={() => WebBrowser.openBrowserAsync('https://rshoaib.github.io/ovctech/azantime/privacy-policy.html')}
          />
        </View>
      </ScrollView>

      {/* Calculation Method Modal */}
      <Modal visible={showMethodModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[c.backgroundLight, c.background]} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Method</Text>
              <Pressable onPress={() => setShowMethodModal(false)} style={styles.modalClose}>
                <FontAwesome name="times" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={CALCULATION_METHODS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalItem, item.key === method && styles.modalItemActive]}
                  onPress={() => handleMethodChange(item.key)}
                >
                  <Text style={[styles.modalItemText, item.key === method && styles.modalItemTextActive]}>
                    {item.label}
                  </Text>
                  {item.key === method && <FontAwesome name="check" size={16} color={c.gold} />}
                </Pressable>
              )}
            />
          </LinearGradient>
        </View>
      </Modal>

      {/* Advance Time Modal */}
      <Modal visible={showAdvanceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[c.backgroundLight, c.background]} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Time</Text>
              <Pressable onPress={() => setShowAdvanceModal(false)} style={styles.modalClose}>
                <FontAwesome name="times" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            {ADVANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.modalItem, opt.value === advance && styles.modalItemActive]}
                onPress={() => handleAdvanceChange(opt.value)}
              >
                <Text style={[styles.modalItemText, opt.value === advance && styles.modalItemTextActive]}>
                  {opt.label}
                </Text>
                {opt.value === advance && <FontAwesome name="check" size={16} color={c.gold} />}
              </Pressable>
            ))}
          </LinearGradient>
        </View>
      </Modal>

      {/* Reciter Modal */}
      <Modal visible={showReciterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[c.backgroundLight, c.background]} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Azan Reciter</Text>
              <Pressable onPress={() => setShowReciterModal(false)} style={styles.modalClose}>
                <FontAwesome name="times" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={RECITERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalItem, item.id === reciter && styles.modalItemActive]}
                  onPress={() => handleReciterChange(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemText, item.id === reciter && styles.modalItemTextActive]}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: Theme.fontSize.xs, color: c.textMuted, marginTop: 2 }}>
                      {item.location}
                    </Text>
                  </View>
                  {item.id === reciter && <FontAwesome name="check" size={16} color={c.gold} />}
                </Pressable>
              )}
            />
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: Theme.spacing.md },
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

  // Sections
  section: { marginBottom: Theme.spacing.lg, paddingHorizontal: Theme.spacing.lg },
  sectionTitle: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: c.textMuted,
    letterSpacing: 2,
    marginBottom: Theme.spacing.smd,
    paddingLeft: Theme.spacing.xs,
  },
  subSectionTitle: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    marginTop: Theme.spacing.smd,
    marginBottom: Theme.spacing.sm,
    paddingLeft: Theme.spacing.xs,
  },

  // Appearance segmented control
  segment: {
    flexDirection: 'row',
    backgroundColor: c.surfaceDark,
    borderRadius: Theme.borderRadius.full,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: Theme.spacing.smd,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
  },
  segmentBtnActive: { backgroundColor: c.gold },
  segmentText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: c.textSecondary,
  },
  segmentTextActive: { color: c.textPrimary },

  // Setting cards
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    marginBottom: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: Theme.fontSize.md,
    color: c.textPrimary,
    fontWeight: Theme.fontWeight.semibold,
  },
  settingValue: {
    fontSize: Theme.fontSize.sm,
    color: c.textSecondary,
    marginTop: 2,
  },

  // Prayer toggles
  prayerToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.smd,
    borderWidth: 1,
    borderColor: c.cardBorder,
    marginBottom: 6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder,
  },
  modalTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: c.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: c.textMuted + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.cardBorder + '40',
  },
  modalItemActive: {
    backgroundColor: c.gold + '10',
  },
  modalItemText: {
    fontSize: Theme.fontSize.md,
    color: c.textPrimary,
  },
  modalItemTextActive: {
    color: c.gold,
    fontWeight: Theme.fontWeight.bold,
  },
});
