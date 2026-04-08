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

export function SessionCard({ session, onPress, testID }: SessionCardProps) {
  const router = useRouter();
  const uniqueExercises = new Set(session.sets.map((s) => s.exerciseName)).size;
  const totalSets = session.sets.length;

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
});
