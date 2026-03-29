import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useSession } from '@/hooks/useSession';
import { WorkoutTemplate, LogSetInput } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface SetState {
  actualReps: string;
  actualWeight: string;
  logged: boolean;
}

export default function StartWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { startSession, logSet, completeSession, isLoading: sessionLoading } = useSession();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [setStates, setSetStates] = useState<Record<string, SetState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const res = await api.get<{ template: WorkoutTemplate }>(`/api/workouts/${id}`);
        setTemplate(res.template);
        const session = await startSession(id, res.template.name);
        setSessionId(session.id);

        // Initialize set state map
        const states: Record<string, SetState> = {};
        for (const ex of res.template.exercises) {
          for (const s of ex.sets) {
            states[`${ex.id}-${s.setNumber}`] = {
              actualReps: '',
              actualWeight: '',
              logged: false,
            };
          }
        }
        setSetStates(states);
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Failed to start session' });
        router.back();
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [id]);

  function updateSetState(key: string, field: 'actualReps' | 'actualWeight', value: string) {
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function markSetDone(exerciseId: string, exerciseName: string, setNumber: number, unit: string) {
    if (!sessionId) return;
    const key = `${exerciseId}-${setNumber}`;
    const state = setStates[key];
    const payload: LogSetInput = {
      exerciseId,
      exerciseName,
      setNumber,
      actualReps: state.actualReps ? parseInt(state.actualReps, 10) : undefined,
      actualWeight: state.actualWeight ? parseFloat(state.actualWeight) : undefined,
      unit,
    };
    try {
      await logSet(sessionId, payload);
      setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], logged: true } }));
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to log set' });
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      await completeSession(sessionId, notes || undefined);
      Toast.show({ type: 'success', text1: 'Workout complete!' });
      router.replace('/history');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to complete session' });
      setIsCompleting(false);
    }
  }

  if (isLoading || !template) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>{template.name}</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {template.exercises.map((exercise) => (
            <Card key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.notes ? (
                <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
              ) : null}

              <View style={styles.setHeader}>
                <Text style={[styles.colLabel, { width: 40 }]}>Set</Text>
                <Text style={styles.colLabel}>Target</Text>
                <Text style={styles.colLabel}>Reps</Text>
                <Text style={styles.colLabel}>Weight</Text>
                <View style={{ width: 60 }} />
              </View>

              {exercise.sets.map((set) => {
                const key = `${exercise.id}-${set.setNumber}`;
                const state = setStates[key] ?? { actualReps: '', actualWeight: '', logged: false };
                return (
                  <View key={set.id} style={[styles.setRow, state.logged && styles.setRowDone]}>
                    <Text style={[styles.setNum, { width: 40 }]}>{set.setNumber}</Text>
                    <Text style={styles.setTarget}>
                      {set.targetReps ? `${set.targetReps}×` : ''}
                      {set.targetWeight ? `${set.targetWeight}${set.unit}` : ''}
                    </Text>
                    <View style={styles.setInput}>
                      <Text
                        style={styles.inputField}
                        onPress={() => {}}
                      >
                        {/* Using Text as label; actual Input below */}
                      </Text>
                      <TextInputInline
                        value={state.actualReps}
                        onChange={(v) => updateSetState(key, 'actualReps', v)}
                        placeholder={set.targetReps?.toString() ?? '0'}
                        editable={!state.logged}
                        testID={`set-${key}-reps`}
                      />
                    </View>
                    <View style={styles.setInput}>
                      <TextInputInline
                        value={state.actualWeight}
                        onChange={(v) => updateSetState(key, 'actualWeight', v)}
                        placeholder={set.targetWeight?.toString() ?? '0'}
                        editable={!state.logged}
                        testID={`set-${key}-weight`}
                      />
                    </View>
                    <Button
                      onPress={() => markSetDone(exercise.id, exercise.name, set.setNumber, set.unit)}
                      variant={state.logged ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={state.logged}
                      style={styles.doneBtn}
                      testID={`set-${key}-done`}
                    >
                      {state.logged ? '✓' : 'Done'}
                    </Button>
                  </View>
                );
              })}
            </Card>
          ))}

          <Button
            onPress={handleComplete}
            loading={isCompleting}
            size="lg"
            style={styles.completeBtn}
            testID="complete-workout-btn"
          >
            Complete Workout
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TextInputInline({
  value,
  onChange,
  placeholder,
  editable,
  testID,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  editable: boolean;
  testID?: string;
}) {
  const { TextInput } = require('react-native');
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType="decimal-pad"
      editable={editable}
      style={[styles.inlineInput, !editable && styles.inlineInputDone]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
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
  exerciseCard: { gap: spacing.sm },
  exerciseName: { fontSize: typography.lg, fontWeight: '600', color: colors.text },
  exerciseNotes: { fontSize: typography.sm, color: colors.textMuted, fontStyle: 'italic' },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  colLabel: { fontSize: typography.xs, fontWeight: '600', color: colors.textMuted, width: 60 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  setRowDone: { opacity: 0.5 },
  setNum: { fontSize: typography.sm, color: colors.textSecondary },
  setTarget: { fontSize: typography.sm, color: colors.textMuted, width: 60 },
  setInput: { width: 60 },
  inputField: {},
  inlineInput: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.xs,
    fontSize: typography.sm,
    color: colors.text,
    textAlign: 'center',
    width: 60,
    minHeight: 36,
  },
  inlineInputDone: {
    borderColor: colors.success,
    color: colors.success,
  },
  doneBtn: { width: 60 },
  completeBtn: { marginTop: spacing.md },
});
