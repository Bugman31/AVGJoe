import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { Program } from '@/types';

interface Props {
  program: Program;
  onArchive?: () => void;
}

export function ProgramSummaryCard({ program, onArchive }: Props) {
  const progressFraction = program.totalWeeks > 0
    ? (program.currentWeek - 1) / program.totalWeeks
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{program.status.toUpperCase()}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.weekLabel}>
            Week {program.currentWeek} of {program.totalWeeks}
          </Text>
          {onArchive && (
            <TouchableOpacity onPress={onArchive} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.name} numberOfLines={2}>{program.name}</Text>

      {program.aiGoalSummary ? (
        <Text style={styles.goal} numberOfLines={2}>{program.aiGoalSummary}</Text>
      ) : program.description ? (
        <Text style={styles.goal} numberOfLines={2}>{program.description}</Text>
      ) : null}

      <ProgressBar
        value={progressFraction}
        color={colors.accent}
        height={5}
        label={`${Math.round(progressFraction * 100)}% complete`}
        showPercent={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.accentLight,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  name: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 26,
  },
  goal: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: -4,
  },
});
