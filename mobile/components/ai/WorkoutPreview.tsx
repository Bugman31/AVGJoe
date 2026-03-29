import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AiProgram, WorkoutTemplate } from '@/types';
import { colors, spacing, typography, radii } from '@/lib/theme';

interface WorkoutPreviewProps {
  program: AiProgram;
}

export function WorkoutPreview({ program }: WorkoutPreviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weeks = Array.from(
    new Set(program.templates.map((t) => t.weekNumber ?? 1)),
  ).sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      <Card style={styles.summary}>
        <Text style={styles.programName}>{program.programName}</Text>
        <Text style={styles.programDesc}>{program.programDescription}</Text>
        <View style={styles.summaryMeta}>
          <Badge variant="accent">{program.totalWeeks} weeks</Badge>
          <Badge variant="default">{program.templates.length} workouts</Badge>
        </View>
      </Card>

      {weeks.map((week) => {
        const weekTemplates = program.templates.filter((t) => (t.weekNumber ?? 1) === week);
        return (
          <View key={week}>
            <Text style={styles.weekLabel}>Week {week}</Text>
            {weekTemplates.map((template) => (
              <WorkoutAccordion
                key={template.id}
                template={template}
                expanded={expandedId === template.id}
                onToggle={() =>
                  setExpandedId(expandedId === template.id ? null : template.id)
                }
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function WorkoutAccordion({
  template,
  expanded,
  onToggle,
}: {
  template: WorkoutTemplate;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card style={styles.accordionCard}>
      <Pressable style={styles.accordionHeader} onPress={onToggle}>
        <View style={styles.accordionTitle}>
          {template.dayOfWeek ? (
            <Text style={styles.dayLabel}>{template.dayOfWeek}</Text>
          ) : null}
          <Text style={styles.workoutName}>{template.name}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.exerciseList}>
          {template.exercises.map((ex) => (
            <View key={ex.id} style={styles.exercise}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseSets}>
                {ex.sets.length} sets
                {ex.sets[0]?.targetReps ? ` × ${ex.sets[0].targetReps} reps` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summary: {
    gap: spacing.sm,
  },
  programName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
  },
  programDesc: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  summaryMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  weekLabel: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  accordionCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  accordionTitle: {
    flex: 1,
    gap: 2,
  },
  dayLabel: {
    fontSize: typography.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  workoutName: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  exercise: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: typography.sm,
    color: colors.text,
    flex: 1,
  },
  exerciseSets: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});
