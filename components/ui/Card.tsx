/**
 * Card — the app's standard elevated surface (tokenized, theme-aware).
 *
 * Replaces the per-screen `settingCard` / card StyleSheet blocks that were
 * duplicated across screens. Pass `row` for the icon-left / accessory-right
 * layout used by setting rows; pass `onPress` to make it pressable (adds the
 * pressed highlight automatically).
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Theme, ThemeColors } from '@/constants/theme';
import { useThemeStyles } from '@/constants/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  row?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, disabled, testID, row, style }: CardProps) {
  const styles = useThemeStyles(makeStyles);
  const base: StyleProp<ViewStyle> = [styles.card, row && styles.row, style];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={base}>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pressed: { backgroundColor: c.cardHighlight },
  });
