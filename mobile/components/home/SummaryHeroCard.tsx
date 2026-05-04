import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { ActiveProgramSummary } from '@/types';

interface Props {
  program: ActiveProgramSummary;
  onStartWorkout: () => void;
}

export function SummaryHeroCard({ program, onStartWorkout }: Props) {
  const router = useRouter();
  const { nextWorkout } = program;

  return (
    <View style={styles.card}>
      {/* Program context line */}
      <View style={styles.contextRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={styles.contextText} numberOfLines={1}>
          {program.name} · Week {program.currentWeek}/{program.totalWeeks}
        </Text>
      </View>

      {nextWorkout ? (
        <>
          <View style={styles.titleRow}>
            <Text style={styles.workoutName} numberOfLines={2}>
              {nextWorkout.name}
            </Text>
            {nextWorkout.focus && (
              <View style={styles.focusBadge}>
                <Text style={styles.focusText}>{nextWorkout.focus}</Text>
              </View>
            )}
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {nextWorkout.estimatedDuration && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.metaText}>{nextWorkout.estimatedDuration} min</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="barbell-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{nextWorkout.exerciseCount} exercises</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{nextWorkout.dayOfWeek}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.startBtn} onPress={onStartWorkout} activeOpacity={0.85}>
              <Ionicons name="play" size={17} color="#fff" />
              <Text style={styles.startBtnText}>Start Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push('/(app)/program')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewBtnText}>View Program</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* All workouts complete for this week */
        <View style={styles.completeState}>
          <Ionicons name="checkmark-circle" size={30} color={colors.success} />
          <Text style={styles.completeTitle}>Week {program.currentWeek} complete</Text>
          <Text style={styles.completeSubtitle}>All workouts done. Great week.</Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push('/(app)/program')}
            activeOpacity={0.75}
          >
            <Text style={styles.viewBtnText}>View Program</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function NoProgramHeroCard() {
  const router = useRouter();
  return (
    <View style={styles.noProgramCard}>
      <Ionicons name="calendar-outline" size={32} color={colors.accent} style={{ marginBottom: 10 }} />
      <Text style={styles.noProgramTitle}>Set up your training program</Text>
      <Text style={styles.noProgramSubtitle}>
        Choose a community program or build a personalized one with AI.
      </Text>
      <View style={styles.noProgramActions}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={() => router.push('/(app)/program')}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <Text style={styles.generateBtnText}>Generate Program</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => router.push('/(app)/program')}
          activeOpacity={0.75}
        >
          <Text style={styles.browseBtnText}>Browse / Build</Text>
        </TouchableOpacity>
      </View>
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
    gap: 14,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contextText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  workoutName: {
    flex: 1,
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 26,
  },
  focusBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    marginTop: 2,
  },
  focusText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 14,
    gap: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: typography.md,
    fontWeight: '700',
  },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  completeState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  completeTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  completeSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  // No-program state
  noProgramCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  noProgramTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noProgramSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  noProgramActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: '700',
  },
  browseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  browseBtnText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
