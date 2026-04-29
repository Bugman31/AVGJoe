import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export interface WorkoutCalendarProps {
  year: number;
  month: number; // 0-indexed
  markedDates: Map<string, { score?: number | null }>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  today: string; // "YYYY-MM-DD"
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday-first
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dotColor(score?: number | null): string {
  if (score == null) return theme.colors.success;
  if (score >= 9) return theme.colors.success;
  if (score >= 7) return theme.colors.primary;
  if (score >= 5) return theme.colors.warning;
  return theme.colors.danger;
}

export function WorkoutCalendar({
  year,
  month,
  markedDates,
  selectedDate,
  onSelectDate,
  today,
}: WorkoutCalendarProps) {
  const days = buildCalendarDays(year, month);

  return (
    <View>
      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label) => (
          <Text key={label} style={styles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {days.map((date, idx) => {
          if (!date) {
            return <View key={`pad-${idx}`} style={styles.cell} />;
          }

          const key = toDateKey(date);
          const isToday = key === today;
          const isSelected = key === selectedDate;
          const mark = markedDates.get(key);
          const isCurrentMonth = date.getMonth() === month;

          return (
            <TouchableOpacity
              key={key}
              style={styles.cell}
              onPress={() => onSelectDate(key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSelected && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    !isCurrentMonth && styles.dayNumberMuted,
                    isSelected && styles.dayNumberSelected,
                    isToday && !isSelected && styles.dayNumberToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              {mark && (
                <View style={[styles.dot, { backgroundColor: dotColor(mark.score) }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  dayCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayNumber: {
    fontSize: 14,
    color: theme.colors.text,
  },
  dayNumberMuted: {
    color: theme.colors.textMuted,
  },
  dayNumberSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayNumberToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },
});
