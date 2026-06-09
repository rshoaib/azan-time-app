/**
 * SettingRow — one labelled row with an emoji icon-chip, optional sub-value,
 * and a right-hand accessory (Switch, chevron, control…). Tokenized and
 * theme-aware; owns the card styling so screens no longer redefine it.
 *
 * - `onPress` makes the whole row pressable and, when no `right` is supplied,
 *   shows a chevron automatically.
 * - `right` overrides the accessory (pass a Switch, segmented control, etc.).
 * - `tint` is the icon-chip base colour (rendered at ~12% alpha).
 */
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { Theme, ThemeColors } from '@/constants/theme';
import { useTheme, useThemeStyles } from '@/constants/ThemeContext';

interface SettingRowProps {
  label: string;
  emoji?: string;
  tint?: string;
  value?: string;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SettingRow({
  label,
  emoji,
  tint,
  value,
  valueStyle,
  onPress,
  disabled,
  testID,
  right,
  style,
}: SettingRowProps) {
  const { colors: c } = useTheme();
  const styles = useThemeStyles(makeStyles);

  const accessory =
    right !== undefined
      ? right
      : onPress
        ? <FontAwesome name="chevron-right" size={14} color={c.textMuted} />
        : null;

  const inner = (
    <>
      <View style={styles.left}>
        {!!emoji && (
          <View style={[styles.icon, tint ? { backgroundColor: tint + '20' } : null]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        )}
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{label}</Text>
          {!!value && <Text style={[styles.value, valueStyle]}>{value}</Text>}
        </View>
      </View>
      {accessory}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.card, style]}>
      {inner}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
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
    cardPressed: { backgroundColor: c.cardHighlight },
    left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    icon: {
      width: 38,
      height: 38,
      borderRadius: Theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emoji: { fontSize: Theme.fontSize.body },
    labelWrap: { flex: 1 },
    label: {
      fontSize: Theme.fontSize.md,
      color: c.textPrimary,
      fontWeight: Theme.fontWeight.semibold,
    },
    value: { fontSize: Theme.fontSize.sm, color: c.textSecondary, marginTop: 2 },
  });
