import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { PlannedWorkout } from '@/types';

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

type WorkoutStatus = 'completed' | 'skipped' | 'today' | 'planned';

function getStatus(workout: PlannedWorkout, todayName: string): WorkoutStatus {
  if (workout.isCompleted) return 'completed';
  if (workout.isSkipped) return 'skipped';
  if (workout.dayOfWeek === todayName) return 'today';
  return 'planned';
}

const STATUS_CONFIG: Record<WorkoutStatus, { iconName: string; iconColor: string; borderColor: string; bg: string; labelColor: string }> = {
  completed: { iconName: 'checkmark-circle', iconColor: colors.success, borderColor: colors.success + '50', bg: colors.successLight, labelColor: colors.success },
  skipped:   { iconName: 'remove-circle-outline', iconColor: colors.textMuted, borderColor: colors.border, bg: colors.surface, labelColor: colors.textMuted },
  today:     { iconName: 'radio-button-on', iconColor: colors.accent, borderColor: colors.accent + '60', bg: colors.accentLight, labelColor: colors.accent },
  planned:   { iconName: 'ellipse-outline', iconColor: colors.textMuted, borderColor: colors.border, bg: colors.surface, labelColor: colors.textSecondary },
};

interface Props {
  workout: PlannedWorkout;
  todayName: string;
  onStart?: () => void;
  onSkip?: () => void;
  onRestore?: () => void;
  isStarting?: boolean;
  isActioning?: boolean;
}

export function ScheduledWorkoutRow({
  workout,
  todayName,
  onStart,
  onSkip,
  onRestore,
  isStarting,
  isActioning,
}: Props) {
  const status = getStatus(workout, todayName);
  const cfg = STATUS_CONFIG[status];
  const short = DAY_SHORT[workout.dayOfWeek] ?? workout.dayOfWeek.slice(0, 3);

  return (
    <View style={[styles.row, { borderColor: cfg.borderColor, backgroundColor: cfg.bg }]}>
      {/* Status icon */}
      <View style={styles.iconCol}>
        <Ionicons name={cfg.iconName as any} size={22} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.day, { color: cfg.labelColor }]}>{short}</Text>
          {status === 'today' && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>Today</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, status === 'skipped' && styles.nameSkipped]} numberOfLines={1}>
          {workout.name}
        </Text>
        {workout.focus ? (
          <Text style={styles.focus} numberOfLines={1}>{workout.focus}</Text>
        ) : null}
        <Text style={styles.meta}>
          {workout.exercises.length} exercises
          {workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ''}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {status === 'skipped' && onRestore ? (
          <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} disabled={isActioning}>
            {isActioning
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.restoreBtnText}>Restore</Text>}
          </TouchableOpacity>
        ) : status === 'completed' ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        ) : (
          <View style={styles.rightActions}>
            {onSkip && (
              <TouchableOpacity onPress={onSkip} disabled={isActioning} style={styles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {isActioning
                  ? <ActivityIndicator size="small" color={colors.textMuted} />
                  : <Ionicons name="close-outline" size={18} color={colors.textMuted} />}
              </TouchableOpacity>
            )}
            {onStart && (
              <TouchableOpacity style={styles.startBtn} onPress={onStart} disabled={isStarting || isActioning}>
                {isStarting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="play" size={14} color="#fff" />}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
  },
  iconCol: {
    width: 26,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  day: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text,
  },
  nameSkipped: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  focus: {
    fontSize: typography.xs,
    color: colors.accent,
    fontWeight: '500',
  },
  meta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  restoreBtnText: {
    fontSize: typography.xs,
    color: colors.accent,
    fontWeight: '600',
  },
});
