import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutCalendar } from '@/components/progress/WorkoutCalendar';
import { api } from '@/lib/api';
import { theme, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';

interface SessionSummary {
  id: string;
  name: string;
  completedAt: string | null;
  completionScore: number | null;
  performanceScore: number | null;
  workoutScore?: number | null;
  scoreLabel?: string | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSelectedDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function scoreColor(score?: number | null): string {
  if (score == null) return theme.colors.success;
  if (score >= 9) return theme.colors.success;
  if (score >= 7) return theme.colors.primary;
  if (score >= 5) return theme.colors.warning;
  return theme.colors.danger;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = todayKey();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setIsLoading(true);
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
    try {
      const res = await api.get<{ sessions: SessionSummary[] }>(
        `/api/sessions?from=${from}&to=${to}&limit=100`
      );
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(year, month);
    setSelectedDate(null);
  }, [year, month, fetchMonth]);

  const markedDates = new Map<string, { score?: number | null }>();
  for (const s of sessions) {
    if (s.completedAt) {
      const key = toDateKey(s.completedAt);
      const existing = markedDates.get(key);
      const score = s.workoutScore ?? s.completionScore;
      if (!existing || (score != null && (existing.score == null || score < existing.score))) {
        markedDates.set(key, { score });
      }
    }
  }

  const sessionsOnDate = selectedDate
    ? sessions.filter((s) => s.completedAt && toDateKey(s.completedAt) === selectedDate)
    : [];

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarCard}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <WorkoutCalendar
              year={year}
              month={month}
              markedDates={markedDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              today={today}
            />
          )}
        </View>

        {/* Selected date panel */}
        {selectedDate && (
          <View style={styles.selectedPanel}>
            <Text style={styles.selectedDateLabel}>
              {formatSelectedDate(selectedDate)}
            </Text>
            {sessionsOnDate.length === 0 ? (
              <Text style={styles.noWorkoutText}>No workout logged</Text>
            ) : (
              sessionsOnDate.map((s) => {
                const score = s.workoutScore ?? s.completionScore;
                const color = scoreColor(score);
                return (
                  <View key={s.id} style={styles.sessionCard}>
                    <View style={styles.sessionCardLeft}>
                      <Text style={styles.sessionName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.scoreLabel ? (
                        <Text style={[styles.scoreLabel, { color }]}>{s.scoreLabel}</Text>
                      ) : score != null ? (
                        <Text style={[styles.scoreLabel, { color }]}>
                          Score {Math.round(score)}%
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => router.push(`/(app)/progress/${s.id}`)}
                    >
                      <Text style={styles.viewBtnText}>View</Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { width: 36 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: TAB_BAR_BOTTOM_INSET,
    gap: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingBox: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPanel: {
    gap: 10,
  },
  selectedDateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  noWorkoutText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    paddingVertical: 4,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionCardLeft: {
    flex: 1,
    gap: 3,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
