import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';

interface Props {
  value: 'current' | 'past';
  onChange: (v: 'current' | 'past') => void;
}

export function ProgramSegmentedControl({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {(['current', 'past'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, value === tab && styles.tabActive]}
          onPress={() => onChange(tab)}
          activeOpacity={0.75}
        >
          <Text style={[styles.label, value === tab && styles.labelActive]}>
            {tab === 'current' ? 'Current' : 'Past'}
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
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#fff',
  },
});
