import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Theme, ThemeColors } from '@/constants/theme';
import { useThemeStyles } from '@/constants/ThemeContext';

export default function NotFoundScreen() {
  const styles = useThemeStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Theme.spacing.lg,
      backgroundColor: c.background,
    },
    title: {
      fontSize: Theme.fontSize.mlg,
      fontWeight: Theme.fontWeight.bold,
      color: c.textPrimary,
    },
    link: {
      marginTop: Theme.spacing.md,
      paddingVertical: Theme.spacing.md,
    },
    linkText: {
      fontSize: Theme.fontSize.md,
      color: c.goldText,
    },
  });
