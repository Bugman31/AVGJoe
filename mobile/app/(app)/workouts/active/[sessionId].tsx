/**
 * Active workout screen for program-based sessions.
 * Phase 2 additions:
 *  - Rest timer banner (auto-starts after each logged set)
 *  - Previous session data shown per exercise
 *  - Floating notes FAB
 *  - RPE bottom-sheet picker (replaces tap-cycle)
 *  - Haptic feedback on set completion
 *  - Optional set-completion sound
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { RpePicker } from '@/components/workouts/RpePicker';
import { api } from '@/lib/api';
import { theme } from '@/lib/theme';
import { saveWorkout } from '@/lib/healthkit';
import { useRestTimer, REST_TIMER_OPTIONS, type RestTimerDuration } from '@/hooks/useRestTimer';
import { useSetCompleteSound } from '@/hooks/useSetCompleteSound';
import type { WorkoutSession, PlannedWorkout, PlannedExercise, WorkoutSummary } from '@/types';

interface SetState {
  actualReps: string;
  actualWeight: string;
  rpe: number | null;
  logged: boolean;
}

interface LastSetData {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
}

export default function ActiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [plannedWorkout, setPlannedWorkout] = useState<PlannedWorkout | null>(null);
  const [setStates, setSetStates] = useState<Record<string, SetState>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Previous session data keyed by exercise name
  const [lastSessionData, setLastSessionData] = useState<Record<string, LastSetData[]>>({});

  // Pre/post energy + soreness
  const [preEnergy, setPreEnergy] = useState<number | null>(null);
  const [postEnergy, setPostEnergy] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // UI state
  const [showPreEnergyModal, setShowPreEnergyModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // RPE picker state
  const [rpePickerKey, setRpePickerKey] = useState<string | null>(null);

  // Rest timer
  const restTimer = useRestTimer();
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  // Sound
  const { play: playSound } = useSetCompleteSound();

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await api.get<{ session: WorkoutSession }>(`/api/sessions/${sessionId}`);
        setSession(sessionRes.session);

        if (sessionRes.session.plannedWorkoutId && sessionRes.session.programId) {
          const progRes = await api.get<{ program: { plannedWorkouts: PlannedWorkout[] } }>(`/api/programs/active`);
          const pw = progRes.program?.plannedWorkouts.find(
            (p: PlannedWorkout) => p.id === sessionRes.session.plannedWorkoutId
          );
          if (pw) {
            setPlannedWorkout(pw);
            initSetStates(pw.exercises);
            // Load previous session data for each unique exercise
            loadLastSessionData(pw.exercises, sessionId);
          }
        }

        setShowPreEnergyModal(true);
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to load workout' });
        router.back();
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [sessionId]);

  async function loadLastSessionData(exercises: PlannedExercise[], currentSessionId: string) {
    const uniqueNames = [...new Set(exercises.map((e) => e.name))];
    const results = await Promise.allSettled(
      uniqueNames.map((name) =>
        api.get<{ sets: LastSetData[] }>(
          `/api/sessions/last-exercise/${encodeURIComponent(name)}?excludeSession=${currentSessionId}`
        )
      )
    );
    const map: Record<string, LastSetData[]> = {};
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.sets.length > 0) {
        map[uniqueNames[i]] = result.value.sets;
      }
    });
    setLastSessionData(map);
  }

  function initSetStates(exercises: PlannedExercise[]) {
    const states: Record<string, SetState> = {};
    exercises.forEach((ex, ei) => {
      ex.sets.forEach((s) => {
        states[`${ei}-${s.setNumber}`] = { actualReps: '', actualWeight: '', rpe: null, logged: false };
      });
    });
    setSetStates(states);
  }

  function updateSetField(key: string, field: 'actualReps' | 'actualWeight', value: string) {
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function setRpe(key: string, rpe: number) {
    // rpe = 0 means "clear"
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], rpe: rpe || null } }));
  }

  async function logSet(exerciseIndex: number, exercise: PlannedExercise, setNumber: number, unit: string) {
    if (!sessionId) return;
    const key = `${exerciseIndex}-${setNumber}`;
    const state = setStates[key];

    // Feature 6: require reps before marking done
    if (!state.actualReps || state.actualReps.trim() === '') {
      Toast.show({ type: 'error', text1: 'Enter reps before marking done' });
      return;
    }

    const payload = {
      exerciseId: `planned-${exerciseIndex}`,
      exerciseName: exercise.name,
      setNumber,
      actualReps: state.actualReps ? parseInt(state.actualReps, 10) : undefined,
      actualWeight: state.actualWeight ? parseFloat(state.actualWeight) : undefined,
      unit,
      rpe: state.rpe ?? undefined,
    };

    try {
      await api.post(`/api/sessions/${sessionId}/sets`, payload);
      setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], logged: true } }));

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Sound
      playSound();

      // Start rest timer
      restTimer.start();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to log set' });
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      const res = await api.patch<{ session: WorkoutSession & { aiSummary?: string } }>(
        `/api/sessions/${sessionId}/complete`,
        {
          notes: notes || undefined,
          postEnergyLevel: postEnergy ?? undefined,
          sorenessLevel: soreness ?? undefined,
        }
      );
      setShowFinishModal(false);

      if (res.session.startedAt && res.session.completedAt) {
        saveWorkout({
          sessionId,
          name: res.session.name,
          startDate: new Date(res.session.startedAt),
          endDate: new Date(res.session.completedAt),
        }).catch(() => {});
      }

      router.replace(`/(app)/workouts/${sessionId}/summary`);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to complete workout' });
      setIsCompleting(false);
    }
  }

  if (isLoading) return <Spinner fullScreen />;

  const exercises = plannedWorkout?.exercises ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Exit Workout', 'Your progress is saved. Exit anyway?', [
            { text: 'Continue', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {plannedWorkout?.name ?? session?.name ?? 'Workout'}
        </Text>
        {/* Timer duration selector */}
        <TouchableOpacity onPress={() => setShowTimerSettings(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="timer-outline" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Warmup strip */}
      {plannedWorkout?.warmup && plannedWorkout.warmup.length > 0 && (
        <View style={styles.warmupStrip}>
          <Ionicons name="flame-outline" size={14} color={theme.colors.warning} />
          <Text style={styles.warmupText} numberOfLines={1}>
            Warmup: {plannedWorkout.warmup.map((w) => w.name).join(' · ')}
          </Text>
        </View>
      )}

      {/* Rest timer banner */}
      {restTimer.isActive && (
        <View style={styles.timerBanner}>
          <Ionicons name="timer-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.timerText}>Rest — {restTimer.remaining}s</Text>
          <TouchableOpacity onPress={restTimer.stop} style={styles.timerSkip}>
            <Text style={styles.timerSkipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {exercises.map((exercise, ei) => {
            const prevSets = lastSessionData[exercise.name];
            return (
              <Card key={ei} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}

                {/* Previous session data */}
                {prevSets && prevSets.length > 0 && (
                  <View style={styles.prevRow}>
                    <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                    <Text style={styles.prevText}>
                      Last: {prevSets.map((s) =>
                        `${s.actualWeight ?? 'BW'}${s.unit === 'kg' ? 'kg' : 'lb'} × ${s.actualReps ?? '?'}`
                      ).join('  ')}
                    </Text>
                  </View>
                )}

                {/* Set header */}
                <View style={styles.setHeader}>
                  <Text style={[styles.colLabel, styles.colSet]}>Set</Text>
                  <Text style={[styles.colLabel, styles.colTarget]}>Target</Text>
                  <Text style={[styles.colLabel, styles.colInput]}>Reps</Text>
                  <Text style={[styles.colLabel, styles.colInput]}>Wt</Text>
                  <Text style={[styles.colLabel, styles.colRpe]}>RPE</Text>
                  <View style={styles.colDone} />
                </View>

                {exercise.sets.map((set) => {
                  const key = `${ei}-${set.setNumber}`;
                  const state = setStates[key] ?? { actualReps: '', actualWeight: '', rpe: null, logged: false };
                  return (
                    <View key={set.setNumber} style={[styles.setRow, state.logged && styles.setRowDone]}>
                      <Text style={[styles.colSet, styles.setNum]}>{set.setNumber}</Text>
                      <Text style={[styles.colTarget, styles.setTarget]}>
                        {set.targetReps ? `${set.targetReps}r` : ''}
                        {set.rpeTarget ? ` @${set.rpeTarget}` : ''}
                      </Text>
                      <TextInput
                        style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                        value={state.actualReps}
                        onChangeText={(v) => updateSetField(key, 'actualReps', v)}
                        placeholder={set.targetReps?.toString() ?? ''}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="number-pad"
                        editable={!state.logged}
                        testID={`reps-input-${ei}-${set.setNumber}`}
                      />
                      <TextInput
                        style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                        value={state.actualWeight}
                        onChangeText={(v) => updateSetField(key, 'actualWeight', v)}
                        placeholder={set.targetWeight?.toString() ?? ''}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!state.logged}
                        testID={`weight-input-${ei}-${set.setNumber}`}
                      />
                      {/* RPE — opens bottom sheet picker */}
                      <TouchableOpacity
                        style={[styles.rpePill, !!state.rpe && styles.rpePillActive]}
                        onPress={() => { if (!state.logged) setRpePickerKey(key); }}
                        disabled={state.logged}
                        testID={`rpe-btn-${ei}-${set.setNumber}`}
                      >
                        <Text style={[styles.rpePillText, !!state.rpe && styles.rpePillTextActive]}>
                          {state.rpe ?? '—'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.doneBtn, state.logged && styles.doneBtnDone]}
                        onPress={() => !state.logged && logSet(ei, exercise, set.setNumber, set.unit)}
                        disabled={state.logged}
                        testID={`done-btn-${ei}-${set.setNumber}`}
                      >
                        <Ionicons
                          name={state.logged ? 'checkmark' : 'checkmark-outline'}
                          size={18}
                          color={state.logged ? theme.colors.success : theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </Card>
            );
          })}

          {/* Conditioning block */}
          {plannedWorkout?.conditioning && (
            <Card style={styles.condCard}>
              <View style={styles.condHeader}>
                <Ionicons name="pulse-outline" size={18} color={theme.colors.warning} />
                <Text style={styles.condTitle}>Conditioning</Text>
              </View>
              <Text style={styles.condDesc}>{plannedWorkout.conditioning.description}</Text>
              <Text style={styles.condMeta}>
                {plannedWorkout.conditioning.duration} · {plannedWorkout.conditioning.intensity}
              </Text>
            </Card>
          )}

          <TouchableOpacity style={styles.finishBtn} onPress={() => setShowFinishModal(true)}>
            <Text style={styles.finishBtnText}>Finish Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating notes FAB */}
      <TouchableOpacity
        style={[styles.fab, restTimer.isActive && styles.fabWithTimer]}
        onPress={() => setShowNotesModal(true)}
        testID="notes-fab"
      >
        <Ionicons name={notes ? 'create' : 'create-outline'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* ── Pre-energy modal ───────────────────────────────────────── */}
      <Modal visible={showPreEnergyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How's your energy?</Text>
            <Text style={styles.modalSubtitle}>Rate your energy level before starting</Text>
            <EnergyPicker value={preEnergy} onChange={setPreEnergy} />
            <TouchableOpacity
              style={[styles.modalBtn, !preEnergy && styles.modalBtnDisabled]}
              onPress={() => preEnergy && setShowPreEnergyModal(false)}
            >
              <Text style={styles.modalBtnText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notes modal ────────────────────────────────────────────── */}
      <Modal visible={showNotesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Session Notes</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="How's the workout going? Any issues?"
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              autoFocus
              testID="notes-input"
            />
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowNotesModal(false)}>
              <Text style={styles.modalBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Finish modal ───────────────────────────────────────────── */}
      <Modal visible={showFinishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finish Workout</Text>
            <Text style={styles.modalSubtitle}>How did it go?</Text>

            <Text style={styles.modalSectionLabel}>Post-workout energy</Text>
            <EnergyPicker value={postEnergy} onChange={setPostEnergy} />

            <Text style={styles.modalSectionLabel}>Soreness / fatigue</Text>
            <EnergyPicker value={soreness} onChange={setSoreness} lowLabel="Fresh" highLabel="Wrecked" />

            {notes ? (
              <View style={styles.notePreview}>
                <Ionicons name="create-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.notePreviewText} numberOfLines={2}>{notes}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFinishModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleComplete} disabled={isCompleting}>
                <Text style={styles.confirmBtnText}>{isCompleting ? 'Saving…' : 'Complete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RPE Picker ─────────────────────────────────────────────── */}
      <RpePicker
        visible={rpePickerKey !== null}
        value={rpePickerKey ? (setStates[rpePickerKey]?.rpe ?? null) : null}
        onSelect={(rpe) => { if (rpePickerKey) setRpe(rpePickerKey, rpe); }}
        onClose={() => setRpePickerKey(null)}
      />

      {/* ── Timer settings modal ───────────────────────────────────── */}
      <Modal visible={showTimerSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rest Timer</Text>
            <Text style={styles.modalSubtitle}>Auto-starts after each logged set</Text>
            <View style={styles.timerOptions}>
              {REST_TIMER_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.timerOption, restTimer.selectedDuration === d && styles.timerOptionActive]}
                  onPress={() => { restTimer.setSelectedDuration(d); setShowTimerSettings(false); }}
                >
                  <Text style={[styles.timerOptionText, restTimer.selectedDuration === d && styles.timerOptionTextActive]}>
                    {d}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTimerSettings(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── EnergyPicker (unchanged) ─────────────────────────────────────────────────
function EnergyPicker({
  value,
  onChange,
  lowLabel = 'Low',
  highLabel = 'High',
}: {
  value: number | null;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <View style={energyStyles.container}>
      <View style={energyStyles.labels}>
        <Text style={energyStyles.label}>{lowLabel}</Text>
        <Text style={energyStyles.label}>{highLabel}</Text>
      </View>
      <View style={energyStyles.buttons}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <TouchableOpacity
            key={n}
            style={[energyStyles.btn, value === n && energyStyles.btnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[energyStyles.btnText, value === n && energyStyles.btnTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  warmupStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  warmupText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
  // Rest timer banner
  timerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.primaryLight, borderBottomWidth: 1, borderBottomColor: theme.colors.primary + '40' },
  timerText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  timerSkip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary },
  timerSkipText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  timerOptions: { flexDirection: 'row', gap: 10 },
  timerOption: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  timerOptionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  timerOptionText: { fontSize: 16, fontWeight: '700', color: theme.colors.textSecondary },
  timerOptionTextActive: { color: theme.colors.primary },
  // Content
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  exerciseCard: { gap: 10 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  exerciseNotes: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  // Previous session row
  prevRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  prevText: { fontSize: 11, color: theme.colors.textMuted, flex: 1 },
  // Set table
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  colLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase' },
  colSet: { width: 28 },
  colTarget: { flex: 1 },
  colInput: { width: 50, textAlign: 'center' },
  colRpe: { width: 36, textAlign: 'center' },
  colDone: { width: 36 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 4 },
  setRowDone: { opacity: 0.55 },
  setNum: { fontSize: 13, color: theme.colors.textSecondary },
  setTarget: { fontSize: 12, color: theme.colors.textMuted },
  inlineInput: {
    backgroundColor: theme.colors.surfaceHover,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    minHeight: 34,
  },
  inlineInputDone: { borderColor: theme.colors.success + '60', color: theme.colors.success },
  rpePill: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  rpePillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  rpePillText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  rpePillTextActive: { color: theme.colors.primary },
  doneBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  doneBtnDone: { borderColor: theme.colors.success + '60', backgroundColor: theme.colors.successLight },
  condCard: { gap: 8 },
  condHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  condTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  condDesc: { fontSize: 14, color: theme.colors.text },
  condMeta: { fontSize: 12, color: theme.colors.textSecondary },
  finishBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  finishBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  // FAB
  fab: { position: 'absolute', bottom: 96, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  fabWithTimer: { bottom: 140 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  modalSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: -8 },
  modalSectionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelBtnText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  notesInput: { backgroundColor: theme.colors.surfaceHover, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 100 },
  notePreview: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: theme.colors.bg, padding: 10, borderRadius: 8 },
  notePreviewText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
});

const energyStyles = StyleSheet.create({
  container: { gap: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, color: theme.colors.textMuted },
  buttons: { flexDirection: 'row', gap: 4 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, alignItems: 'center' },
  btnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  btnText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  btnTextActive: { color: theme.colors.primary },
});
