import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { WorkoutTemplate } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    api
      .get<{ template: WorkoutTemplate }>(`/api/workouts/${id}`)
      .then((res) => setTemplate(res.template))
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load workout' }))
      .finally(() => setIsLoading(false));
  }, [id]);

  function confirmDelete() {
    Alert.alert(
      'Delete Workout',
      'This will permanently delete the workout template. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await api.delete(`/api/workouts/${id}`);
      Toast.show({ type: 'success', text1: 'Workout deleted' });
      router.replace('/workouts');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete workout' });
      setIsDeleting(false);
    }
  }

  if (isLoading) return <Spinner fullScreen />;
  if (!template) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>{template.name}</Text>
        <Pressable onPress={confirmDelete} disabled={isDeleting} testID="delete-btn">
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {template.description ? (
          <Text style={styles.description}>{template.description}</Text>
        ) : null}

        <View style={styles.badges}>
          {template.isAiGenerated && <Badge variant="accent">AI Generated</Badge>}
          {template.dayOfWeek && <Badge variant="default">{template.dayOfWeek}</Badge>}
          {template.weekNumber != null && (
            <Badge variant="default">Week {template.weekNumber}</Badge>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {template.exercises.length} Exercise{template.exercises.length !== 1 ? 's' : ''}
        </Text>

        {template.exercises.map((exercise) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            {exercise.notes ? (
              <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
            ) : null}
            <View style={styles.setHeader}>
              <Text style={styles.colLabel}>Set</Text>
              <Text style={styles.colLabel}>Reps</Text>
              <Text style={styles.colLabel}>Weight</Text>
            </View>
            {exercise.sets.map((s) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNum}>{s.setNumber}</Text>
                <Text style={styles.setVal}>{s.targetReps ?? '—'}</Text>
                <Text style={styles.setVal}>
                  {s.targetWeight != null ? `${s.targetWeight} ${s.unit}` : '—'}
                </Text>
              </View>
            ))}
          </Card>
        ))}

        <Button
          onPress={() => router.push(`/workouts/${id}/start`)}
          size="lg"
          style={styles.startBtn}
          testID="start-session-btn"
        >
          Start Workout
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text, flex: 1, marginHorizontal: spacing.md },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  description: { fontSize: typography.md, color: colors.textSecondary },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  exerciseCard: { gap: spacing.sm },
  exerciseName: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  exerciseNotes: { fontSize: typography.sm, color: colors.textMuted, fontStyle: 'italic' },
  setHeader: { flexDirection: 'row', gap: spacing.xl },
  colLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.textMuted, width: 60 },
  setRow: { flexDirection: 'row', gap: spacing.xl },
  setNum: { fontSize: typography.sm, color: colors.textSecondary, width: 60 },
  setVal: { fontSize: typography.sm, color: colors.text, width: 60 },
  startBtn: { marginTop: spacing.md },
});
