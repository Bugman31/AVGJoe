import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { colors, spacing, typography, radii } from '@/lib/theme';
import { exerciseLibrary, type LibraryExercise } from '@/lib/exerciseLibrary';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import type { WorkoutSession, SessionSet } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  strength: colors.accent,
  cardio: '#ef4444',
  mobility: '#22c55e',
};

interface HistoryEntry {
  sessionId: string;
  sessionName: string;
  completedAt: string;
  sets: SessionSet[];
  maxWeight: number | null;
  totalReps: number;
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const decodedName = decodeURIComponent(name ?? '');

  const { customExercises } = useCustomExercises();

  const exercise: LibraryExercise | undefined = useMemo(() => {
    return (
      [...exerciseLibrary, ...customExercises].find(
        (e) => e.name.toLowerCase() === decodedName.toLowerCase()
      )
    );
  }, [decodedName, customExercises]);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!decodedName) return;
    api
      .get<{ sessions: WorkoutSession[] }>('/api/sessions?limit=50')
      .then((res) => {
        const entries: HistoryEntry[] = [];
        for (const session of res.sessions) {
          if (!session.sets || session.sets.length === 0) continue;
          const matched = session.sets.filter(
            (s) => s.exerciseName?.toLowerCase() === decodedName.toLowerCase()
          );
          if (matched.length === 0) continue;
          const weights = matched
            .map((s) => s.actualWeight)
            .filter((w): w is number => w != null);
          const totalReps = matched.reduce(
            (sum, s) => sum + (s.actualReps ?? 0),
            0
          );
          entries.push({
            sessionId: session.id,
            sessionName: session.name,
            completedAt: session.completedAt ?? session.startedAt,
            sets: matched,
            maxWeight: weights.length > 0 ? Math.max(...weights) : null,
            totalReps,
          });
        }
        // Sort by most recent first
        entries.sort(
          (a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        setHistory(entries);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [decodedName]);

  const pr = useMemo(() => {
    const allWeights = history.flatMap((h) =>
      h.sets.map((s) => s.actualWeight).filter((w): w is number => w != null)
    );
    return allWeights.length > 0 ? Math.max(...allWeights) : null;
  }, [history]);

  const totalSessions = history.length;

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Exercise not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accentColor = CATEGORY_COLORS[exercise.category] ?? colors.accent;
  const muscles = exercise.muscleGroups.map((m) => m.replace(/_/g, ' ')).join(', ');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.catBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
          <Text style={[styles.catBadgeText, { color: accentColor }]}>{exercise.category}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{exercise.name}</Text>

        {/* Info cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="body-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Muscles</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{muscles}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="sync-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Pattern</Text>
            <Text style={styles.infoValue}>{exercise.movementPattern.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="list-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Default</Text>
            <Text style={styles.infoValue}>{exercise.defaultSets}×{exercise.defaultReps}</Text>
          </View>
        </View>

        {/* Stats */}
        {(pr != null || totalSessions > 0) && (
          <View style={styles.statsRow}>
            {pr != null && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{pr}</Text>
                <Text style={styles.statLabel}>Personal Record (lbs)</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions Logged</Text>
            </View>
          </View>
        )}

        {/* History */}
        <Text style={styles.sectionTitle}>History</Text>

        {isLoading ? (
          <Spinner />
        ) : history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyHistoryText}>No sessions logged yet</Text>
            <Text style={styles.emptyHistoryHint}>
              Start a workout that includes this exercise to track your progress.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <TouchableOpacity
                key={entry.sessionId}
                style={styles.historyCard}
                onPress={() => router.push(`/(app)/progress/${entry.sessionId}`)}
                activeOpacity={0.7}
              >
                <View style={styles.historyCardTop}>
                  <View>
                    <Text style={styles.historySession}>{entry.sessionName}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.completedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyStats}>
                    {entry.maxWeight != null && (
                      <Text style={styles.historyWeight}>{entry.maxWeight} lbs</Text>
                    )}
                    <Text style={styles.historySets}>{entry.sets.length} sets</Text>
                  </View>
                </View>

                {/* Set breakdown */}
                <View style={styles.setBreakdown}>
                  {entry.sets.map((s, i) => (
                    <View key={i} style={styles.setChip}>
                      <Text style={styles.setChipText}>
                        {s.actualReps ?? '—'} × {s.actualWeight != null ? `${s.actualWeight}${s.unit ?? ''}` : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  catBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.full, borderWidth: 1,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  title: { fontSize: typography.xxl, fontWeight: '800', color: colors.text },
  infoRow: { flexDirection: 'row', gap: spacing.sm },
  infoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    alignItems: 'center',
  },
  infoLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: typography.xs, fontWeight: '600', color: colors.text, textAlign: 'center', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.accent + '12',
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  statValue: { fontSize: typography.xxl, fontWeight: '800', color: colors.accent },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  emptyHistory: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyHistoryText: { fontSize: typography.md, fontWeight: '600', color: colors.textSecondary },
  emptyHistoryHint: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },
  historyList: { gap: spacing.sm },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historySession: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  historyDate: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  historyStats: { alignItems: 'flex-end' },
  historyWeight: { fontSize: typography.md, fontWeight: '700', color: colors.accent },
  historySets: { fontSize: typography.xs, color: colors.textSecondary },
  setBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setChip: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setChipText: { fontSize: typography.xs, color: colors.textSecondary },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: typography.lg, color: colors.textSecondary },
});
