import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressChart } from '@/components/history/ProgressChart';
import { api } from '@/lib/api';
import { WorkoutSession } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ session: WorkoutSession }>(`/api/sessions/${sessionId}`)
      .then((res) => setSession(res.session))
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load session' }))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  if (isLoading) return <Spinner fullScreen />;
  if (!session) return null;

  // Group sets by exercise
  const exerciseMap = new Map<string, { name: string; exerciseId: string; sets: typeof session.sets }>();
  for (const s of session.sets) {
    const existing = exerciseMap.get(s.exerciseName);
    if (existing) {
      existing.sets.push(s);
    } else {
      exerciseMap.set(s.exerciseName, { name: s.exerciseName, exerciseId: s.exerciseId, sets: [s] });
    }
  }
  const exercises = Array.from(exerciseMap.values());

  const duration = session.completedAt
    ? Math.round(
        (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000,
      )
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>{session.name}</Text>
        {session.completedAt ? (
          <Badge variant="success">Done</Badge>
        ) : (
          <Badge variant="accent">Active</Badge>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {new Date(session.startedAt).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {duration != null && (
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.summaryText}>{duration} minutes</Text>
            </View>
          )}
          {session.notes && (
            <Text style={styles.notes}>{session.notes}</Text>
          )}
        </Card>

        {exercises.map((ex) => (
          <View key={ex.exerciseId}>
            <Card style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <View style={styles.setHeader}>
                <Text style={styles.colLabel}>Set</Text>
                <Text style={styles.colLabel}>Reps</Text>
                <Text style={styles.colLabel}>Weight</Text>
              </View>
              {ex.sets.map((s) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNum}>{s.setNumber}</Text>
                  <Text style={styles.setVal}>{s.actualReps ?? '—'}</Text>
                  <Text style={styles.setVal}>
                    {s.actualWeight != null ? `${s.actualWeight} ${s.unit}` : '—'}
                  </Text>
                </View>
              ))}
            </Card>

            <Card style={styles.chartCard}>
              <ProgressChart
                exerciseId={ex.exerciseId}
                exerciseName={ex.name}
              />
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text, flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  summaryCard: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryText: { fontSize: typography.sm, color: colors.textSecondary },
  notes: { fontSize: typography.sm, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
  exerciseCard: { gap: spacing.sm },
  exerciseName: { fontSize: typography.lg, fontWeight: '600', color: colors.text },
  setHeader: { flexDirection: 'row', gap: spacing.xl },
  colLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.textMuted, width: 60 },
  setRow: { flexDirection: 'row', gap: spacing.xl },
  setNum: { fontSize: typography.sm, color: colors.textSecondary, width: 60 },
  setVal: { fontSize: typography.sm, color: colors.text, width: 60 },
  chartCard: {},
});
