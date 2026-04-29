import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SessionCard } from '@/components/history/SessionCard';
import { Spinner } from '@/components/ui/Spinner';
import { ExerciseLineChart, type ChartPoint } from '@/components/charts/ExerciseLineChart';
import { api } from '@/lib/api';
import { theme, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import type { WorkoutSession } from '@/types';

interface SessionWithScores extends WorkoutSession {
  completionScore?: number | null;
  performanceScore?: number | null;
}

interface ProgressPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
  reps: number;
  isPR: boolean;
}

interface ExerciseHistorySet {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
}

interface ExerciseHistoryEntry {
  sessionId: string;
  sessionName: string;
  completedAt: string;
  sets: ExerciseHistorySet[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSet(set: ExerciseHistorySet): string {
  const reps = set.actualReps != null ? `${set.actualReps} reps` : null;
  const weight = set.actualWeight != null ? `${set.actualWeight} ${set.unit ?? 'lbs'}` : null;
  if (reps && weight) return `${reps} × ${weight}`;
  if (reps) return reps;
  if (weight) return weight;
  return '—';
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState<SessionWithScores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Exercise search state
  const [loggedExercises, setLoggedExercises] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [historyData, setHistoryData] = useState<ExerciseHistoryEntry[]>([]);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);

  async function loadSessions() {
    try {
      const res = await api.get<{ sessions: SessionWithScores[]; total: number }>(
        '/api/sessions?limit=50&includeSets=true'
      );
      setSessions(res.sessions);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function loadLoggedExercises() {
    try {
      const res = await api.get<{ exercises: string[] }>('/api/sessions/logged-exercises');
      setLoggedExercises(res.exercises);
    } catch {
      // silent fail
    }
  }

  async function loadExerciseData(name: string) {
    setIsLoadingExercise(true);
    setChartData([]);
    setHistoryData([]);
    try {
      const [chartRes, historyRes] = await Promise.all([
        api.get<{ progress: ProgressPoint[] }>(
          `/api/sessions/progress-by-name/${encodeURIComponent(name)}?weeks=16`
        ),
        api.get<{ history: ExerciseHistoryEntry[] }>(
          `/api/sessions/exercise-history/${encodeURIComponent(name)}`
        ),
      ]);
      setChartData(
        chartRes.progress.map((p) => ({ date: p.date, maxWeight: p.maxWeight, isPR: p.isPR }))
      );
      setHistoryData(historyRes.history);
    } catch {
      setChartData([]);
      setHistoryData([]);
    } finally {
      setIsLoadingExercise(false);
    }
  }

  useEffect(() => {
    loadSessions();
    loadLoggedExercises();
  }, []);

  const selectExercise = useCallback((name: string) => {
    setSelectedExercise(name);
    setExerciseSearch('');
    loadExerciseData(name);
  }, []);

  const clearExercise = useCallback(() => {
    setSelectedExercise(null);
    setChartData([]);
    setHistoryData([]);
  }, []);

  const completedSessions = sessions.filter((s) => s.completedAt);
  const totalVolume = completedSessions.length;
  const avgCompletion =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.completionScore ?? 75), 0) /
            completedSessions.length
        )
      : 0;
  const avgPerformance =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + (s.performanceScore ?? 70), 0) /
            completedSessions.length
        )
      : 0;

  const filteredExercises = exerciseSearch.trim()
    ? loggedExercises.filter((e) => e.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : loggedExercises;

  const prCount = chartData.filter((p) => p.isPR).length;

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSessions();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Progress</Text>
              <View style={styles.titleButtons}>
                <TouchableOpacity
                  style={styles.insightsBtn}
                  onPress={() => router.push('/(app)/progress/insights')}
                >
                  <Ionicons name="bulb-outline" size={16} color="#9B5CFF" />
                  <Text style={styles.insightsBtnText}>Insights</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarBtn}
                  onPress={() => router.push('/(app)/progress/calendar')}
                >
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.calendarBtnText}>Calendar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats row */}
            {completedSessions.length > 0 && (
              <View style={styles.statsRow}>
                <StatBlock value={`${totalVolume}`} label="Sessions" />
                <StatBlock value={`${avgCompletion}%`} label="Avg Completion" />
                <StatBlock value={`${avgPerformance}%`} label="Avg Performance" />
              </View>
            )}

            {/* Exercise lookup */}
            <Text style={styles.sectionTitle}>Exercise History</Text>
            <View style={styles.chartCard}>

              {/* ── Search / picker state ── */}
              {!selectedExercise ? (
                <>
                  <View style={styles.searchRow}>
                    <Ionicons name="search-outline" size={15} color={theme.colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      value={exerciseSearch}
                      onChangeText={setExerciseSearch}
                      placeholder="Search an exercise…"
                      placeholderTextColor={theme.colors.textMuted}
                      autoCorrect={false}
                    />
                    {exerciseSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setExerciseSearch('')}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {loggedExercises.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="barbell-outline" size={28} color={theme.colors.textMuted} />
                      <Text style={styles.emptyStateText}>
                        Complete workouts to see your exercise history here.
                      </Text>
                    </View>
                  ) : filteredExercises.length === 0 ? (
                    <Text style={styles.noMatchText}>No exercises match "{exerciseSearch}"</Text>
                  ) : (
                    <ScrollView
                      style={styles.exerciseList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {filteredExercises.map((name) => (
                        <TouchableOpacity
                          key={name}
                          style={styles.exerciseRow}
                          onPress={() => selectExercise(name)}
                        >
                          <Ionicons
                            name="barbell-outline"
                            size={16}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.exerciseRowText}>{name}</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              ) : (

                /* ── Selected exercise: chart + history ── */
                <>
                  {/* Header row */}
                  <View style={styles.exerciseHeader}>
                    <TouchableOpacity onPress={clearExercise} style={styles.backBtn}>
                      <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {selectedExercise}
                    </Text>
                    {prCount > 0 && (
                      <View style={styles.prBadge}>
                        <Text style={styles.prBadgeText}>
                          {prCount} PR{prCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isLoadingExercise ? (
                    <View style={styles.loadingBox}>
                      <Spinner />
                    </View>
                  ) : (
                    <>
                      {/* Weight trend chart — only if weighted data exists */}
                      {chartData.length > 0 ? (
                        <>
                          <Text style={styles.subSectionLabel}>Weight Trend</Text>
                          <ExerciseLineChart
                            data={chartData}
                            width={width - 32 - 32}
                            height={160}
                          />
                          <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                              <Text style={styles.legendText}>Max weight</Text>
                            </View>
                            <View style={styles.legendItem}>
                              <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                              <Text style={styles.legendText}>PR</Text>
                            </View>
                          </View>
                        </>
                      ) : null}

                      {/* Session history */}
                      <Text style={styles.subSectionLabel}>
                        Session Log
                        {historyData.length > 0 ? ` (${historyData.length})` : ''}
                      </Text>

                      {historyData.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Ionicons
                            name="calendar-outline"
                            size={28}
                            color={theme.colors.textMuted}
                          />
                          <Text style={styles.emptyStateText}>
                            No logged sessions found for {selectedExercise}.
                          </Text>
                        </View>
                      ) : (
                        historyData.map((entry) => (
                          <View key={entry.sessionId} style={styles.historyCard}>
                            <View style={styles.historyCardHeader}>
                              <Ionicons
                                name="calendar-outline"
                                size={13}
                                color={theme.colors.primary}
                              />
                              <Text style={styles.historyDate}>
                                {formatDate(entry.completedAt)}
                              </Text>
                              <Text style={styles.historySessionName} numberOfLines={1}>
                                {entry.sessionName}
                              </Text>
                            </View>

                            <View style={styles.setsTable}>
                              {/* Header */}
                              <View style={styles.setsHeaderRow}>
                                <Text style={[styles.setCell, styles.setCellLabel]}>Set</Text>
                                <Text style={[styles.setCell, styles.setCellLabel, styles.setCellRight]}>Reps</Text>
                                <Text style={[styles.setCell, styles.setCellLabel, styles.setCellRight]}>Weight</Text>
                              </View>
                              {entry.sets.map((set) => (
                                <View key={set.setNumber} style={styles.setRow}>
                                  <Text style={styles.setCell}>{set.setNumber}</Text>
                                  <Text style={[styles.setCell, styles.setCellRight]}>
                                    {set.actualReps != null ? set.actualReps : '—'}
                                  </Text>
                                  <Text style={[styles.setCell, styles.setCellRight]}>
                                    {set.actualWeight != null
                                      ? `${set.actualWeight} ${set.unit ?? 'lbs'}`
                                      : '—'}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Session History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.sessionItem}>
            <SessionCard
              session={item}
              showExerciseHistory
              onPress={() => router.push(`/(app)/progress/${item.id}`)}
            />
            {(item.completionScore != null || item.performanceScore != null) && (
              <View style={styles.scoreRow}>
                {item.completionScore != null && (
                  <ScorePill label="Done" value={item.completionScore} color={theme.colors.success} />
                )}
                {item.performanceScore != null && (
                  <ScorePill label="Perf" value={item.performanceScore} color={theme.colors.primary} />
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No sessions yet. Start your first workout!</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/(app)/workouts')}
            >
              <Text style={styles.emptyCtaText}>Log a Workout</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.scorePill, { borderColor: color + '40', backgroundColor: color + '15' }]}>
      <Text style={[styles.scorePillText, { color }]}>
        {label} {Math.round(value)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  listContent: { padding: 16, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: 10 },
  header: { gap: 16, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleButtons: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  insightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightsBtnText: { fontSize: 13, fontWeight: '600', color: '#9B5CFF' },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calendarBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statBlock: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Chart card container
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    minHeight: 80,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  exerciseList: { maxHeight: 200 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  exerciseRowText: { flex: 1, fontSize: 14, color: theme.colors.text },
  noMatchText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Empty states
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyStateText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Selected exercise header
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 2 },
  exerciseName: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  prBadge: {
    backgroundColor: theme.colors.warning + '25',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.warning + '60',
  },
  prBadgeText: { fontSize: 11, color: theme.colors.warning, fontWeight: '700' },
  loadingBox: { height: 160, alignItems: 'center', justifyContent: 'center' },

  // Chart legend
  chartLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },

  // History cards
  historyCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  historySessionName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },

  // Sets table
  setsTable: { gap: 2 },
  setsHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 2,
  },
  setRow: { flexDirection: 'row', paddingVertical: 3 },
  setCell: { fontSize: 13, color: theme.colors.text, width: 36 },
  setCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  setCellRight: { flex: 1, textAlign: 'right' },

  // Session list
  sessionItem: { gap: 4 },
  scoreRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  scorePillText: { fontSize: 11, fontWeight: '600' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: 14 },
  emptyCta: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
