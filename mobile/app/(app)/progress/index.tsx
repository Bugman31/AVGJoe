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

export default function ProgressScreen() {
  const [sessions, setSessions] = useState<SessionWithScores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Exercise chart state
  const [loggedExercises, setLoggedExercises] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  async function loadSessions() {
    try {
      const res = await api.get<{ sessions: SessionWithScores[]; total: number }>('/api/sessions?limit=50');
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

  async function loadChartData(name: string) {
    setIsLoadingChart(true);
    try {
      const res = await api.get<{ progress: ProgressPoint[] }>(
        `/api/sessions/progress-by-name/${encodeURIComponent(name)}?weeks=16`
      );
      setChartData(res.progress.map((p) => ({ date: p.date, maxWeight: p.maxWeight, isPR: p.isPR })));
    } catch {
      setChartData([]);
    } finally {
      setIsLoadingChart(false);
    }
  }

  useEffect(() => {
    loadSessions();
    loadLoggedExercises();
  }, []);

  const selectExercise = useCallback((name: string) => {
    setSelectedExercise(name);
    setExerciseSearch('');
    loadChartData(name);
  }, []);

  const completedSessions = sessions.filter((s) => s.completedAt);
  const totalVolume = completedSessions.length;
  const avgCompletion = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.completionScore ?? 75), 0) / completedSessions.length)
    : 0;
  const avgPerformance = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.performanceScore ?? 70), 0) / completedSessions.length)
    : 0;

  const filteredExercises = exerciseSearch.trim()
    ? loggedExercises.filter((e) => e.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : loggedExercises;

  // PR count
  const prCount = chartData.filter((p) => p.isPR).length;

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSessions(); }}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Progress</Text>

            {/* Stats row */}
            {completedSessions.length > 0 && (
              <View style={styles.statsRow}>
                <StatBlock value={`${totalVolume}`} label="Sessions" />
                <StatBlock value={`${avgCompletion}%`} label="Avg Completion" />
                <StatBlock value={`${avgPerformance}%`} label="Avg Performance" />
              </View>
            )}

            {/* Strength chart section */}
            <Text style={styles.sectionTitle}>Strength Chart</Text>
            <View style={styles.chartCard}>
              {/* Exercise search */}
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
                    />
                  </View>
                  {loggedExercises.length === 0 ? (
                    <Text style={styles.chartEmptyText}>
                      Log workouts with weights to see strength charts here.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal={false}
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
                          <Ionicons name="barbell-outline" size={16} color={theme.colors.textSecondary} />
                          <Text style={styles.exerciseRowText}>{name}</Text>
                          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              ) : (
                <>
                  {/* Back + exercise name */}
                  <View style={styles.chartHeader}>
                    <TouchableOpacity onPress={() => { setSelectedExercise(null); setChartData([]); }} style={styles.backBtn}>
                      <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.chartExerciseName} numberOfLines={1}>{selectedExercise}</Text>
                    {prCount > 0 && (
                      <View style={styles.prBadge}>
                        <Text style={styles.prBadgeText}>{prCount} PR{prCount > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>

                  {isLoadingChart ? (
                    <View style={styles.chartPlaceholder}>
                      <Spinner />
                    </View>
                  ) : (
                    <>
                      <ExerciseLineChart
                        data={chartData}
                        width={width - 32 - 32} // screen padding - card padding
                        height={180}
                      />
                      {chartData.length > 0 && (
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
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(app)/workouts')}>
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
      <Text style={[styles.scorePillText, { color }]}>{label} {Math.round(value)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  listContent: { padding: 16, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: 10 },
  header: { gap: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBlock: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  // Chart card
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    minHeight: 80,
  },
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
  exerciseList: { maxHeight: 180 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  exerciseRowText: { flex: 1, fontSize: 14, color: theme.colors.text },
  chartEmptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 2 },
  chartExerciseName: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  prBadge: { backgroundColor: theme.colors.warning + '25', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.colors.warning + '60' },
  prBadgeText: { fontSize: 11, color: theme.colors.warning, fontWeight: '700' },
  chartPlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center' },
  chartLegend: { flexDirection: 'row', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },
  // Session list
  sessionItem: { gap: 4 },
  scoreRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  scorePillText: { fontSize: 11, fontWeight: '600' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: 14 },
  emptyCta: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 12 },
  emptyCtaText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
