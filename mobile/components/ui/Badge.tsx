import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/lib/theme';

type BadgeVariant = 'default' | 'accent' | 'success' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: colors.surfaceHover,
  },
  accent: {
    backgroundColor: colors.accentLight,
  },
  success: {
    backgroundColor: colors.successLight,
  },
  danger: {
    backgroundColor: colors.dangerLight,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: '500',
  },
  text_default: { color: colors.textSecondary },
  text_accent: { color: colors.accent },
  text_success: { color: colors.success },
  text_danger: { color: colors.danger },
});
