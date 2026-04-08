import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SessionCard } from '@/components/history/SessionCard';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { theme } from '@/lib/theme';
import type { WorkoutSession } from '@/types';

interface SessionWithScores extends WorkoutSession {
  completionScore?: number | null;
  performanceScore?: number | null;
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState<SessionWithScores[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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

  useEffect(() => { loadSessions(); }, []);

  const completedSessions = sessions.filter((s) => s.completedAt);
  const totalVolume = completedSessions.length;
  const avgCompletion = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.completionScore ?? 75), 0) / completedSessions.length)
    : 0;
  const avgPerformance = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.performanceScore ?? 70), 0) / completedSessions.length)
    : 0;

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions(); }} tintColor={theme.colors.primary} />}
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
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  header: { gap: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBlock: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  sessionItem: { gap: 4 },
  scoreRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
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
