import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { WorkoutTemplate } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface WorkoutCardProps {
  workout: WorkoutTemplate;
  testID?: string;
}

export function WorkoutCard({ workout, testID }: WorkoutCardProps) {
  const router = useRouter();
  const exerciseCount = workout.exercises.length;
  const setCount = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <Pressable
      onPress={() => router.push(`/workouts/${workout.id}`)}
      testID={testID}
    >
      <Card>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{workout.name}</Text>
          {workout.isAiGenerated ? (
            <Badge variant="accent">AI</Badge>
          ) : null}
        </View>

        {workout.description ? (
          <Text style={styles.description} numberOfLines={2}>{workout.description}</Text>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{setCount} set{setCount !== 1 ? 's' : ''}</Text>
          </View>
          {workout.dayOfWeek ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{workout.dayOfWeek}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.startText}>Start Workout</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  startText: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.accent,
  },
});
