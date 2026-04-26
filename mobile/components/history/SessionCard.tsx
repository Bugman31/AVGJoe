import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WorkoutSession } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface SessionCardProps {
  session: WorkoutSession;
  onPress?: () => void;
  testID?: string;
  showExerciseHistory?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatSetPreview(set: NonNullable<WorkoutSession['sets']>[number]): string {
  const reps = set.actualReps != null ? `${set.actualReps}` : null;
  const weight = set.actualWeight != null ? `${set.actualWeight} ${set.unit || 'lbs'}` : null;

  if (reps && weight) return `${reps} x ${weight}`;
  if (reps) return `${reps} reps`;
  if (weight) return weight;
  return 'Logged';
}

function buildExerciseSummaries(sets: NonNullable<WorkoutSession['sets']>) {
  const grouped = new Map<string, string[]>();

  for (const set of sets) {
    const previews = grouped.get(set.exerciseName) ?? [];
    previews.push(formatSetPreview(set));
    grouped.set(set.exerciseName, previews);
  }

  return Array.from(grouped.entries()).map(([name, previews]) => ({
    name,
    preview: previews.slice(0, 4).join(', '),
    hiddenCount: Math.max(previews.length - 4, 0),
  }));
}

export function SessionCard({
  session,
  onPress,
  testID,
  showExerciseHistory = false,
}: SessionCardProps) {
  const router = useRouter();
  const sets = session.sets ?? [];
  const uniqueExercises = new Set(sets.map((s) => s.exerciseName)).size;
  const totalSets = sets.length > 0 ? sets.length : (session._count?.sets ?? 0);
  const exerciseSummaries = showExerciseHistory ? buildExerciseSummaries(sets) : [];

  return (
    <Pressable onPress={onPress ?? (() => router.push(`/history/${session.id}`))} testID={testID}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{session.name}</Text>
          {session.completedAt ? (
            <Badge variant="success">Done</Badge>
          ) : (
            <Badge variant="accent">Active</Badge>
          )}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formatDate(session.startedAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formatDuration(session.startedAt, session.completedAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{uniqueExercises} exercises</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="list-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{totalSets} sets</Text>
          </View>
        </View>

        {session.notes ? (
          <Text style={styles.notes} numberOfLines={2}>{session.notes}</Text>
        ) : null}

        {showExerciseHistory && exerciseSummaries.length > 0 ? (
          <View style={styles.exerciseHistory}>
            <Text style={styles.exerciseHistoryLabel}>Movement History</Text>
            {exerciseSummaries.slice(0, 3).map((exercise) => (
              <View key={exercise.name} style={styles.exerciseHistoryRow}>
                <Text style={styles.exerciseHistoryName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={styles.exerciseHistoryValue} numberOfLines={2}>
                  {exercise.preview}
                  {exercise.hiddenCount > 0 ? `, +${exercise.hiddenCount} more` : ''}
                </Text>
              </View>
            ))}
            {exerciseSummaries.length > 3 ? (
              <Text style={styles.exerciseHistoryMore}>
                +{exerciseSummaries.length - 3} more movements
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  exerciseHistory: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  exerciseHistoryLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  exerciseHistoryRow: {
    gap: 2,
  },
  exerciseHistoryName: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: '600',
  },
  exerciseHistoryValue: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  exerciseHistoryMore: {
    fontSize: typography.sm,
    color: colors.textMuted,
  },
});
