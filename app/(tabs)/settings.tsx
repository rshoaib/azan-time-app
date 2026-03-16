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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme, CALCULATION_METHODS, PRAYER_CONFIG } from '@/constants/theme';
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
  getAzanSoundEnabled,
  setAzanSoundEnabled,
} from '@/services/storageService';
import { stopAzan } from '@/services/audioService';

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
  const [azanSoundOn, setAzanSoundOn] = useState(true);
  const [locationInfo, setLocationInfo] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const m = await getCalculationMethod(); setMethod(m);
    const n = await getNotificationEnabled(); setNotificationsOn(n);
    const e = await getEnabledPrayers(); setEnabledPrayersState(e);
    const a = await getAdvanceMinutes(); setAdvance(a);
    const azanOn = await getAzanSoundEnabled(); setAzanSoundOn(azanOn);
    const loc = await getSavedLocation();
    if (loc) setLocationInfo(`${loc.city}, ${loc.country}`);
  };

  const handleMethodChange = async (key: string) => {
    setMethod(key); await setCalculationMethod(key); setShowMethodModal(false);
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

  const currentMethodLabel = CALCULATION_METHODS.find((m) => m.key === method)?.label || method;
  const currentAdvanceLabel = ADVANCE_OPTIONS.find((o) => o.value === advance)?.label || `${advance} min before`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#F5F6FA', '#EEF0F6']} style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>Customize your Azan experience</Text>
        </LinearGradient>

        {/* Calculation Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧮 PRAYER CALCULATION</Text>
          <Pressable style={({ pressed }) => [styles.settingCard, pressed && styles.settingCardPressed]} onPress={() => setShowMethodModal(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Theme.colors.fajr + '20' }]}>
                <Text style={{ fontSize: 16 }}>📐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Calculation Method</Text>
                <Text style={styles.settingValue}>{currentMethodLabel}</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={Theme.colors.textMuted} />
          </Pressable>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 NOTIFICATIONS</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Theme.colors.emerald + '20' }]}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
              </View>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: Theme.colors.textMuted + '40', true: Theme.colors.gold + '50' }}
              thumbColor={notificationsOn ? Theme.colors.gold : '#666'}
            />
          </View>

          {notificationsOn && (
            <>
              <Pressable style={({ pressed }) => [styles.settingCard, pressed && styles.settingCardPressed]} onPress={() => setShowAdvanceModal(true)}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Theme.colors.teal + '20' }]}>
                    <Text style={{ fontSize: 16 }}>⏰</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Notify Before</Text>
                    <Text style={styles.settingValue}>{currentAdvanceLabel}</Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Theme.colors.textMuted} />
              </Pressable>

              <Text style={styles.subSectionTitle}>Notify for each prayer:</Text>
              {(Object.keys(PRAYER_CONFIG) as PrayerName[]).map((key) => (
                <View key={key} style={styles.prayerToggleCard}>
                  <View style={styles.settingLeft}>
                    <Text style={{ fontSize: 16 }}>{PRAYER_CONFIG[key].emoji}</Text>
                    <Text style={styles.settingLabel}>{PRAYER_CONFIG[key].name}</Text>
                  </View>
                  <Switch
                    value={enabledPrayers[key]}
                    onValueChange={() => handlePrayerToggle(key)}
                    trackColor={{ false: Theme.colors.textMuted + '40', true: PRAYER_CONFIG[key].color + '50' }}
                    thumbColor={enabledPrayers[key] ? PRAYER_CONFIG[key].color : '#666'}
                  />
                </View>
              ))}
            </>
          )}
        </View>

        {/* Azan Sound */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 AZAN SOUND</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Theme.colors.isha + '20' }]}>
                <Text style={{ fontSize: 16 }}>🎵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Play Azan Audio</Text>
                <Text style={styles.settingValue}>
                  {azanSoundOn ? 'Plays when prayer time arrives' : 'Notification only'}
                </Text>
              </View>
            </View>
            <Switch
              value={azanSoundOn}
              onValueChange={handleAzanSoundToggle}
              trackColor={{ false: Theme.colors.textMuted + '40', true: Theme.colors.gold + '50' }}
              thumbColor={azanSoundOn ? Theme.colors.gold : '#666'}
            />
          </View>
        </View>

        {/* Location */}
        {locationInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 LOCATION</Text>
            <View style={styles.settingCard}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Theme.colors.sunrise + '20' }]}>
                  <Text style={{ fontSize: 16 }}>🌍</Text>
                </View>
                <Text style={styles.settingValue}>{locationInfo}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ ABOUT</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Theme.colors.gold + '20' }]}>
                <Text style={{ fontSize: 16 }}>🕌</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Azan Time</Text>
                <Text style={styles.settingValue}>Version 1.1.0</Text>
              </View>
            </View>
          </View>
          <View style={[styles.settingCard, { marginTop: 8 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Theme.colors.fajr + '15' }]}>
                <Text style={{ fontSize: 16 }}>📖</Text>
              </View>
              <Text style={[styles.settingValue, { flex: 1 }]}>
                Prayer times calculated using the Adhan library with high-precision astronomical algorithms.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Calculation Method Modal */}
      <Modal visible={showMethodModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#FFFFFF', '#F5F6FA']} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Method</Text>
              <Pressable onPress={() => setShowMethodModal(false)} style={styles.modalClose}>
                <FontAwesome name="times" size={20} color={Theme.colors.textSecondary} />
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
                  {item.key === method && <FontAwesome name="check" size={16} color={Theme.colors.gold} />}
                </Pressable>
              )}
            />
          </LinearGradient>
        </View>
      </Modal>

      {/* Advance Time Modal */}
      <Modal visible={showAdvanceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#FFFFFF', '#F5F6FA']} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Time</Text>
              <Pressable onPress={() => setShowAdvanceModal(false)} style={styles.modalClose}>
                <FontAwesome name="times" size={20} color={Theme.colors.textSecondary} />
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
                {opt.value === advance && <FontAwesome name="check" size={16} color={Theme.colors.gold} />}
              </Pressable>
            ))}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
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

  // Sections
  section: { marginBottom: 24, paddingHorizontal: Theme.spacing.lg },
  sectionTitle: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  subSectionTitle: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
    marginTop: 12,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Setting cards
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    marginBottom: 2,
  },
  settingCardPressed: {
    backgroundColor: Theme.colors.cardHighlight,
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: Theme.fontSize.md,
    color: Theme.colors.textPrimary,
    fontWeight: Theme.fontWeight.semibold,
  },
  settingValue: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },

  // Prayer toggles
  prayerToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    marginBottom: 6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.textMuted + '20',
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
    borderBottomColor: Theme.colors.cardBorder + '40',
  },
  modalItemActive: {
    backgroundColor: Theme.colors.gold + '10',
  },
  modalItemText: {
    fontSize: Theme.fontSize.md,
    color: Theme.colors.textPrimary,
  },
  modalItemTextActive: {
    color: Theme.colors.gold,
    fontWeight: Theme.fontWeight.bold,
  },
});
