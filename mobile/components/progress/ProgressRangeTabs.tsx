import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { ProgressRange } from '@/types';

const TABS: { value: ProgressRange; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

interface Props {
  value: ProgressRange;
  onChange: (v: ProgressRange) => void;
}

export function ProgressRangeTabs({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={[styles.tab, value === tab.value && styles.tabActive]}
          onPress={() => onChange(tab.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, value === tab.value && styles.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#fff',
  },
});
