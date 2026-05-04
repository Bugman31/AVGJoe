import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { WeekAdherence } from '@/types';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayStatus {
  dayOfWeek: string;
  isCompleted: boolean;
}

interface Props {
  adherence: WeekAdherence;
  weekDays: DayStatus[];
  streak: number;
}

export function WeeklyProgressCard({ adherence, weekDays, streak }: Props) {
  const todayShort = DAY_SHORT[new Date().getDay()];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>This Week</Text>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakText}>{streak} day streak</Text>
            </View>
          )}
          <Text style={styles.adherenceLabel}>
            {adherence.completed}/{adherence.total} done
          </Text>
        </View>
      </View>

      <ProgressBar
        value={adherence.total > 0 ? adherence.completed / adherence.total : 0}
        color={adherence.percent === 100 ? colors.success : colors.accent}
        height={6}
      />

      {weekDays.length > 0 && (
        <View style={styles.days}>
          {weekDays.map((day, i) => {
            const short = day.dayOfWeek.slice(0, 3);
            const isToday = short === todayShort;
            return (
              <View
                key={i}
                style={[
                  styles.dayPill,
                  day.isCompleted && styles.dayPillDone,
                  isToday && !day.isCompleted && styles.dayPillToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    day.isCompleted && styles.dayLabelDone,
                    isToday && !day.isCompleted && styles.dayLabelToday,
                  ]}
                >
                  {short}
                </Text>
                {day.isCompleted && (
                  <Ionicons name="checkmark" size={11} color={colors.success} />
                )}
              </View>
            );
          })}
        </View>
      )}
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
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warning + '20',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  streakFire: {
    fontSize: 12,
  },
  streakText: {
    fontSize: typography.xs,
    color: colors.warning,
    fontWeight: '600',
  },
  adherenceLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  days: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillDone: {
    borderColor: colors.success + '60',
    backgroundColor: colors.successLight,
  },
  dayPillToday: {
    borderColor: colors.accent + '60',
    backgroundColor: colors.accentLight,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayLabelDone: {
    color: colors.success,
  },
  dayLabelToday: {
    color: colors.accent,
    fontWeight: '700',
  },
});
