/**
 * Contact & Feedback — pushed screen (not a tab). Lets the user pick what
 * their message is about, optionally type it, then hands off to WhatsApp
 * (only when configured) or email with the diagnostics block prefilled.
 */
import { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';
import { CONTACT_CONFIG } from '@/constants/contactConfig';
import {
  CONTACT_CATEGORIES,
  type ContactCategory,
  type Diagnostics,
  buildMailtoUrl,
  buildWhatsAppUrl,
  composeMessage,
  composeSubject,
  isWhatsAppConfigured,
} from '@/services/contactService';

/** Live install facts for the prefilled message — all local, works offline. */
function getDiagnostics(): Diagnostics {
  const pc = Platform.constants as { Brand?: string; Model?: string; Release?: string } | undefined;
  return {
    appName: CONTACT_CONFIG.appName,
    version: Constants.expoConfig?.version ?? '?',
    versionCode: String(Constants.expoConfig?.android?.versionCode ?? '?'),
    deviceModel: [pc?.Brand, pc?.Model].filter(Boolean).join(' ') || 'Unknown device',
    osVersion: Platform.OS === 'android' ? `Android ${pc?.Release ?? Platform.Version}` : `${Platform.OS} ${Platform.Version}`,
  };
}

const CATEGORY_EMOJI: Record<ContactCategory, { emoji: string; tint: (c: ThemeColors) => string }> = {
  question: { emoji: '❓', tint: (c) => c.fajr },
  feature: { emoji: '💡', tint: (c) => c.gold },
  problem: { emoji: '🐞', tint: (c) => c.danger },
  build: { emoji: '💼', tint: (c) => c.isha },
};

const WHATSAPP_GREEN = '#25D366';

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c, scheme } = useTheme();
  const styles = useThemeStyles(makeStyles);
  const [category, setCategory] = useState<ContactCategory>('question');
  const [message, setMessage] = useState('');

  const whatsappAvailable = isWhatsAppConfigured(CONTACT_CONFIG.whatsappNumber);

  function openWhatsApp() {
    const d = getDiagnostics();
    const url = buildWhatsAppUrl(CONTACT_CONFIG.whatsappNumber, composeMessage(category, d, message));
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Couldn't open WhatsApp",
        `You can reach us on WhatsApp at ${CONTACT_CONFIG.whatsappNumberDisplay} or by email: ${CONTACT_CONFIG.email}`,
      );
    });
  }

  function openEmail() {
    const d = getDiagnostics();
    const url = buildMailtoUrl(CONTACT_CONFIG.email, composeSubject(category, d), composeMessage(category, d, message));
    Linking.openURL(url).catch(() => {
      Alert.alert('No email app found', `You can reach us at ${CONTACT_CONFIG.email}`);
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Theme.spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header — matches the settings tab's gradient header, plus a back button */}
        <LinearGradient colors={[c.background, c.surfaceDark]} style={[styles.header, { paddingTop: insets.top + Theme.spacing.smd }]}>
          <Pressable
            testID="contact-back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <FontAwesome name="chevron-left" size={16} color={c.textSecondary} />
          </Pressable>
          <Text style={styles.title}>💬 Contact & Feedback</Text>
          <Text style={styles.subtitle}>Questions, ideas or problems — we read everything</Text>
        </LinearGradient>

        {/* Category picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">✉️ WHAT'S IT ABOUT?</Text>
          {CONTACT_CATEGORIES.map((cat) => {
            const selected = category === cat.key;
            const meta = CATEGORY_EMOJI[cat.key];
            return (
              <Pressable
                key={cat.key}
                testID={`contact-category-${cat.key}`}
                onPress={() => setCategory(cat.key)}
                style={[styles.categoryCard, selected && styles.categoryCardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${cat.label}. ${cat.sub}`}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: meta.tint(c) + '20' }]}>
                    <Text style={styles.rowEmoji}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, selected && { color: c.goldText }]}>{cat.label}</Text>
                    <Text style={styles.rowSub}>{cat.sub}</Text>
                  </View>
                </View>
                <FontAwesome
                  name={selected ? 'check-circle' : 'circle-o'}
                  size={22}
                  color={selected ? c.gold : c.textMuted + '70'}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Optional message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">📝 YOUR MESSAGE (OPTIONAL)</Text>
          <TextInput
            testID="contact-message"
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us more — or leave blank and type in WhatsApp/email."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Your message"
          />
          <Text style={styles.diagNote}>
            App version and device info are attached automatically so problems can be fixed faster.
          </Text>
        </View>

        {/* Send buttons */}
        <View style={styles.actions}>
          {whatsappAvailable && (
            <Pressable
              testID="contact-whatsapp"
              style={styles.whatsappBtn}
              onPress={openWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="Contact us on WhatsApp"
            >
              <FontAwesome name="whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappBtnText}>Message on WhatsApp</Text>
            </Pressable>
          )}

          <Pressable
            testID="contact-email"
            style={whatsappAvailable ? styles.emailBtnSecondary : styles.emailBtnPrimary}
            onPress={openEmail}
            accessibilityRole="button"
            accessibilityLabel="Contact us by email"
          >
            <FontAwesome name="envelope" size={16} color={whatsappAvailable ? c.teal : c.onAccent} />
            <Text style={whatsappAvailable ? styles.emailBtnSecondaryText : styles.emailBtnPrimaryText}>
              {whatsappAvailable ? 'Email instead' : 'Send an email'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Theme.spacing.xl },

  // Header (mirrors settings.tsx typography)
  header: { alignItems: 'center', paddingBottom: Theme.spacing.md },
  backBtn: {
    position: 'absolute',
    left: Theme.spacing.lg,
    bottom: Theme.spacing.md + 26,
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: c.textMuted + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  section: { marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm, paddingHorizontal: Theme.spacing.lg },
  sectionTitle: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
    color: c.textMuted,
    letterSpacing: 2,
    marginBottom: Theme.spacing.smd,
    paddingLeft: Theme.spacing.xs,
  },

  // Category rows (card style shared with settings rows / azan-mode options)
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  categoryCardActive: {
    backgroundColor: c.cardHighlight,
    borderColor: c.gold + '50',
    borderWidth: 1.5,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowEmoji: { fontSize: Theme.fontSize.body },
  rowLabel: {
    fontSize: Theme.fontSize.md,
    color: c.textPrimary,
    fontWeight: Theme.fontWeight.semibold,
  },
  rowSub: {
    fontSize: Theme.fontSize.sm,
    color: c.textSecondary,
    marginTop: 2,
  },

  // Message input
  messageInput: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.smd,
    fontSize: Theme.fontSize.md,
    color: c.textPrimary,
    minHeight: 96,
  },
  diagNote: {
    fontSize: Theme.fontSize.xs,
    color: c.textMuted,
    marginTop: Theme.spacing.sm,
    paddingLeft: Theme.spacing.xs,
    lineHeight: 16,
  },

  // Action buttons
  actions: { paddingHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.sm },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    marginBottom: Theme.spacing.sm,
  },
  whatsappBtnText: { color: '#FFFFFF', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.heavy },
  emailBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: c.teal,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
  },
  emailBtnPrimaryText: { color: c.onAccent, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.heavy },
  emailBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: c.teal + '12',
    borderWidth: 1,
    borderColor: c.teal + '25',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
  },
  emailBtnSecondaryText: { color: c.teal, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
});
