import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/lib/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

function getSubValueColor(subValue?: string) {
  if (!subValue) return colors.textSecondary;
  if (subValue.startsWith('+')) return colors.success;
  if (subValue.startsWith('-')) return colors.warning;
  return colors.textSecondary;
}

export function MetricCard({
  label,
  value,
  subValue,
  icon,
  iconColor = colors.accent,
  style,
}: MetricCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
      ) : null}

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>

      {subValue ? (
        <Text style={[styles.subValue, { color: getSubValueColor(subValue) }]}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  iconWrap: {
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
