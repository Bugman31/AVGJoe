import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { ReadinessSummary } from '@/types';

const CONFIG = {
  Ready: {
    icon: 'flash' as const,
    color: colors.success,
    bg: colors.successLight,
    border: colors.success + '40',
    subtitle: "You're good to go.",
  },
  'Needs Recovery': {
    icon: 'moon-outline' as const,
    color: colors.warning,
    bg: colors.warning + '15',
    border: colors.warning + '40',
    subtitle: 'Give your body a little more rest.',
  },
  'Behind Plan': {
    icon: 'alert-circle-outline' as const,
    color: colors.danger,
    bg: colors.dangerLight,
    border: colors.danger + '40',
    subtitle: 'A few missed sessions this week.',
  },
};

interface Props {
  readiness: ReadinessSummary;
}

export function ReadinessCard({ readiness }: Props) {
  const cfg = CONFIG[readiness.label];

  const dayText =
    readiness.daysSinceLast === 0
      ? 'Trained today'
      : readiness.daysSinceLast === 1
      ? 'Last trained yesterday'
      : readiness.daysSinceLast >= 999
      ? 'No recent sessions'
      : `Last trained ${readiness.daysSinceLast}d ago`;

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '20' }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: cfg.color }]}>{readiness.label}</Text>
        <Text style={styles.subtitle}>{cfg.subtitle}</Text>
      </View>
      <Text style={styles.dayText}>{dayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  dayText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
