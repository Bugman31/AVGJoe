import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LibraryExercise } from '@/lib/exerciseLibrary';
import { colors, radii, spacing, typography } from '@/lib/theme';

interface ExerciseListItemProps {
  exercise: LibraryExercise;
  onPress: () => void;
  showMuscles?: boolean;
  isCustom?: boolean;
  onDelete?: () => void;
}

const CATEGORY_COLORS: Record<LibraryExercise['category'], string> = {
  strength: colors.accent,
  cardio: '#ef4444',
  mobility: '#22c55e',
};

const PATTERN_ICONS: Record<LibraryExercise['movementPattern'], string> = {
  push: 'arrow-up-outline',
  pull: 'arrow-down-outline',
  squat: 'chevron-down-outline',
  hinge: 'swap-vertical-outline',
  carry: 'bag-outline',
  core: 'ellipse-outline',
  conditioning: 'flame-outline',
  mobility: 'leaf-outline',
};

export function ExerciseListItem({
  exercise,
  onPress,
  showMuscles = true,
  isCustom = false,
  onDelete,
}: ExerciseListItemProps) {
  const accentColor = CATEGORY_COLORS[exercise.category] ?? colors.accent;
  const patternIcon = PATTERN_ICONS[exercise.movementPattern] ?? 'fitness-outline';
  const muscles = exercise.muscleGroups
    .slice(0, 3)
    .map((muscle) => muscle.replace(/_/g, ' '))
    .join(', ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {isCustom ? (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>custom</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardRight}>
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: accentColor + '20',
                borderColor: accentColor + '40',
              },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: accentColor }]}>
              {exercise.category}
            </Text>
          </View>

          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          ) : null}

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name={patternIcon as any} size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{exercise.movementPattern.replace(/_/g, ' ')}</Text>
        </View>

        {showMuscles ? (
          <View style={styles.metaItem}>
            <Ionicons name="body-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {muscles}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaItem}>
          <Ionicons name="list-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {exercise.defaultSets}x{exercise.defaultReps}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
  },
  customBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
});
