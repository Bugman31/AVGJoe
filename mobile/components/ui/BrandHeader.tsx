import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export function BrandHeader() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <Ionicons name="barbell" size={20} color={colors.accent} />
          <Text style={[styles.brand, { color: colors.accent }]}>Average Joe's</Text>
        </View>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Workout Tracker</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
