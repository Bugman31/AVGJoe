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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { RpePicker } from '@/components/workouts/RpePicker';
import { PlateCalculatorModal } from '@/components/workouts/PlateCalculatorModal';
import { AICoachCard } from '@/components/workouts/AICoachCard';
import { RestTimerModal } from '@/components/workouts/RestTimerModal';
import { WorkoutSummaryBar } from '@/components/workouts/WorkoutSummaryBar';
import { api } from '@/lib/api';
import { theme } from '@/lib/theme';
import {
  isHealthKitAvailable,
  saveWorkout,
  startLiveWorkoutMetrics,
  type LiveWorkoutMetricsSnapshot,
} from '@/lib/healthkit';
import { useRestTimer, REST_TIMER_OPTIONS, type RestTimerDuration } from '@/hooks/useRestTimer';
import { useSetCompleteSound } from '@/hooks/useSetCompleteSound';
import type { WorkoutSession, PlannedWorkout, PlannedExercise, PlannedExerciseSet, WorkoutSummary, UserProfile, SetRecommendation } from '@/types';

/** Resolve a % prescription to an actual suggested weight using profile benchmarks */
function calcSuggestedWeight(set: PlannedExerciseSet, profile: UserProfile | null): number | null {
  if (!set.percentOfMax) return null;
  let orm: number | null = null;
  if (set.percentBasis === 'bench')     orm = profile?.benchmarkBench     ?? null;
  else if (set.percentBasis === 'squat')    orm = profile?.benchmarkSquat    ?? null;
  else if (set.percentBasis === 'deadlift') orm = profile?.benchmarkDeadlift ?? null;
  else if (set.percentBasis === 'press')    orm = profile?.benchmarkPress    ?? null;
  else if (set.percentBasis === 'custom')   orm = set.customOneRepMax        ?? null;
  if (!orm) return null;
  return Math.round(orm * set.percentOfMax / 100);
}

/** Format a set's Target column: shows "75% → 185" for % prescriptions, or "8r @7" for normal */
function formatTarget(set: PlannedExerciseSet, profile: UserProfile | null): string {
  if (set.percentOfMax) {
    const suggested = calcSuggestedWeight(set, profile);
    return suggested
      ? `${set.percentOfMax}% → ${suggested}${set.unit || 'lb'}`
      : `${set.percentOfMax}%`;
  }
  const parts: string[] = [];
  if (set.targetReps) parts.push(`${set.targetReps}r`);
  if (set.rpeTarget)  parts.push(`@${set.rpeTarget}`);
  return parts.join(' ');
}

interface SetState {
  actualReps: string;
  actualWeight: string;
  rpe: number | null;
  logged: boolean;
}

interface ExtraExercise {
  name: string;
  sets: number;
  targetReps: number | null;
  unit: string;
}

interface LastSetData {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
}

interface AICoachState {
  exerciseKey: string;   // 'planned-N' or 'extra-N'
  exerciseIdx: number;
  isExtra: boolean;
  feedback: string | null;
  recommendation: SetRecommendation;
  isLoading: boolean;
}

const DEFAULT_LIVE_METRICS: LiveWorkoutMetricsSnapshot = {
  status: 'unsupported',
  heartRate: null,
  activeEnergyBurned: null,
  heartRateTrend: 'unknown',
  lastHeartRateSampleAt: null,
  lastEnergySampleAt: null,
  lastUpdatedAt: null,
  errorMessage: null,
};

function formatLiveMetricStatus(metrics: LiveWorkoutMetricsSnapshot): string {
  switch (metrics.status) {
    case 'live':
      return 'Live Apple Health';
    case 'stale':
      return 'Apple Health delayed';
    case 'waiting':
      return 'Waiting for Apple Health';
    case 'error':
      return metrics.errorMessage ?? 'Apple Health unavailable';
    case 'unsupported':
    default:
      return 'Apple Health unavailable';
  }
}

function formatHeartRateTrend(
  trend: LiveWorkoutMetricsSnapshot['heartRateTrend'],
): string | null {
  switch (trend) {
    case 'rising':
      return 'HR rising';
    case 'falling':
      return 'HR recovering';
    case 'steady':
      return 'HR steady';
    default:
      return null;
  }
}

export default function ActiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const goHome = () => {
    router.replace('/(app)/home');
  };

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [plannedWorkout, setPlannedWorkout] = useState<PlannedWorkout | null>(null);
  const [setStates, setSetStates] = useState<Record<string, SetState>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Previous session data keyed by exercise name
  const [lastSessionData, setLastSessionData] = useState<Record<string, LastSetData[]>>({});

  // User profile (for % weight calculations)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

  // Extra exercises added by user during session
  const [extraExercises, setExtraExercises] = useState<ExtraExercise[]>([]);
  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set());

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('');

  // AI coach panel
  const [aiCoach, setAiCoach] = useState<AICoachState | null>(null);

  // RPE picker state
  const [rpePickerKey, setRpePickerKey] = useState<string | null>(null);
  const [showPlateCalc, setShowPlateCalc] = useState(false);

  // Elapsed workout time (counts up from session start)
  const [elapsedSecs, setElapsedSecs] = useState(0);
  useEffect(() => {
    if (!session?.startedAt) return;
    const startMs = new Date(session.startedAt).getTime();
    // Set initial value immediately
    setElapsedSecs(Math.floor((Date.now() - startMs) / 1000));
    const id = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  // Rest timer
  const restTimer = useRestTimer();
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [restTotalDuration, setRestTotalDuration] = useState(90);
  const [restAiTip, setRestAiTip] = useState('');
  const [restExerciseName, setRestExerciseName] = useState('');
  const [restSetInfo, setRestSetInfo] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<LiveWorkoutMetricsSnapshot>(DEFAULT_LIVE_METRICS);
  const showWatchReminder = isHealthKitAvailable();

  // Sound
  const { play: playSound } = useSetCompleteSound();

  useEffect(() => {
    async function init() {
      try {
        // Fetch session and profile in parallel
        const [sessionRes, profileRes] = await Promise.all([
          api.get<{ session: WorkoutSession }>(`/api/sessions/${sessionId}`),
          api.get<{ profile: UserProfile }>('/api/profile/me').catch(() => ({ profile: null })),
        ]);

        const profile = profileRes.profile ?? null;
        setUserProfile(profile);
        setSession(sessionRes.session);

        if (sessionRes.session.plannedWorkoutId && sessionRes.session.programId) {
          const progRes = await api.get<{ program: { plannedWorkouts: PlannedWorkout[] } }>(`/api/programs/active`);
          const pw = progRes.program?.plannedWorkouts.find(
            (p: PlannedWorkout) => p.id === sessionRes.session.plannedWorkoutId
          );
          if (pw) {
            setPlannedWorkout(pw);
            initSetStates(pw.exercises, profile);
            // Load previous session data for each unique exercise
            loadLastSessionData(pw.exercises, sessionId);
          }
        }

        setShowPreEnergyModal(true);
      } catch {
        Toast.show({ type: 'error', text1: 'Failed to load workout' });
        goHome();
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [sessionId]);

  useEffect(() => {
    if (!session?.startedAt) return;

    return startLiveWorkoutMetrics(
      { startDate: new Date(session.startedAt) },
      setLiveMetrics,
    );
  }, [session?.startedAt]);

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

  function initSetStates(exercises: PlannedExercise[], profile: UserProfile | null) {
    const states: Record<string, SetState> = {};
    exercises.forEach((ex, ei) => {
      ex.sets.forEach((s) => {
        const suggested = calcSuggestedWeight(s, profile);
        states[`${ei}-${s.setNumber}`] = {
          actualReps: '',
          actualWeight: suggested ? String(suggested) : '',
          rpe: null,
          logged: false,
        };
      });
    });
    setSetStates(states);
  }

  function toggleSkip(key: string) {
    setSkippedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function confirmAddExercise() {
    if (!newExName.trim()) return;
    const count = parseInt(newExSets, 10) || 3;
    const reps = parseInt(newExReps, 10) || null;
    const newEx: ExtraExercise = { name: newExName.trim(), sets: count, targetReps: reps, unit: 'lbs' };
    const prefix = `extra-${extraExercises.length}`;
    const newStates: Record<string, SetState> = {};
    for (let i = 1; i <= count; i++) {
      newStates[`${prefix}-${i}`] = { actualReps: '', actualWeight: '', rpe: null, logged: false };
    }
    setExtraExercises((prev) => [...prev, newEx]);
    setSetStates((prev) => ({ ...prev, ...newStates }));
    setNewExName('');
    setNewExSets('3');
    setNewExReps('');
    setShowAddExercise(false);
  }

  function updateSetField(key: string, field: 'actualReps' | 'actualWeight', value: string) {
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function setRpe(key: string, rpe: number) {
    // rpe = 0 means "clear"
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], rpe: rpe || null } }));
  }

  async function submitSet(payload: {
    exerciseId: string;
    exerciseName: string;
    setNumber: number;
    actualReps?: number;
    actualWeight?: number;
    unit: string;
    rpe?: number;
    targetRepMin?: number;
    targetRepMax?: number;
    progressionType?: 'strength' | 'hypertrophy' | 'conditioning';
  }): Promise<{ recommendation: SetRecommendation }> {
    if (!sessionId) throw new Error('Session not found');
    try {
      const res = await api.post<{ set: unknown; recommendation: SetRecommendation }>(
        `/api/sessions/${sessionId}/sets`,
        payload
      );
      return { recommendation: res.recommendation };
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to log set');
    }
  }

  function deriveRestAiTip(rpe: number | null, missedReps: boolean): string {
    if (missedReps) return 'You missed reps — take extra time before your next attempt.';
    if (rpe != null && rpe >= 9) return 'Your last set was near-maximal. Take the full rest before your next attempt.';
    if (rpe != null && rpe <= 7) return "You felt strong. You can start a bit early if you feel ready.";
    return 'Rest fully before your next set.';
  }

  async function handleLogSet(
    exerciseKey: string,
    exerciseIdx: number,
    isExtra: boolean,
    exerciseName: string,
    setNumber: number,
    unit: string,
    targetRepMin?: number,
    targetRepMax?: number
  ) {
    const key = isExtra
      ? `${exerciseKey}-${setNumber}`
      : `${exerciseIdx}-${setNumber}`;
    const state = setStates[key];
    if (!state || state.logged) return;

    const actualReps = state.actualReps ? parseInt(state.actualReps, 10) : undefined;
    const actualWeight = state.actualWeight ? parseFloat(state.actualWeight) : undefined;

    // Mark logged optimistically
    setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], logged: true } }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound();
    restTimer.start();

    // Prime the full-screen rest modal context
    const totalSets = isExtra
      ? (extraExercises.find((_, i) => `extra-${i}` === exerciseKey)?.sets ?? 3)
      : (exercises[exerciseIdx]?.sets.length ?? 3);
    const missedReps = !!(targetRepMin && actualReps != null && actualReps < targetRepMin);
    setRestTotalDuration(restTimer.selectedDuration);
    setRestAiTip(deriveRestAiTip(state.rpe, missedReps));
    setRestExerciseName(exerciseName);
    setRestSetInfo(`Set ${setNumber} of ${totalSets}`);

    let result: { recommendation: SetRecommendation };
    try {
      result = await submitSet({
        exerciseId: exerciseKey,
        exerciseName,
        setNumber,
        actualReps,
        actualWeight,
        unit,
        rpe: state.rpe ?? undefined,
        targetRepMin,
        targetRepMax,
        progressionType: 'strength',
      });
    } catch (err) {
      setSetStates((prev) => ({ ...prev, [key]: { ...prev[key], logged: false } }));
      restTimer.stop();
      const message = err instanceof Error ? err.message : 'Failed to log set. Please try again.';
      Toast.show({ type: 'error', text1: 'Failed to log set', text2: message });
      return;
    }

    const { recommendation } = result;

    // Show AI coach card (loading state)
    setAiCoach({
      exerciseKey,
      exerciseIdx,
      isExtra,
      feedback: null,
      recommendation,
      isLoading: true,
    });

    // Fetch AI feedback (fire and forget; 5s timeout)
    try {
      const previousSet = setStates[isExtra ? `${exerciseKey}-${setNumber - 1}` : `${exerciseIdx}-${setNumber - 1}`];
      const prevSummary = previousSet?.logged && previousSet.actualReps
        ? `Set ${setNumber - 1}: ${previousSet.actualWeight ?? 'BW'} × ${previousSet.actualReps} @ RPE ${previousSet.rpe ?? '?'}`
        : undefined;

      const feedbackRes = await Promise.race([
        api.post<{ feedback: string }>('/api/ai/set-feedback', {
          exerciseName,
          setNumber,
          targetSets: isExtra
            ? (extraExercises.find((_, i) => `extra-${i}` === exerciseKey)?.sets ?? 3)
            : (exercises.find((_, i) => i === exerciseIdx)?.sets.length ?? 3),
          targetRepMin: targetRepMin ?? 1,
          targetRepMax: targetRepMax ?? 99,
          actualWeight: actualWeight ?? 0,
          actualReps: actualReps ?? 0,
          rpe: state.rpe ?? 7,
          previousSetSummary: prevSummary,
          recommendationReason: recommendation.reason,
          userGoal: userProfile?.primaryGoal,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      setAiCoach((prev) =>
        prev ? { ...prev, feedback: feedbackRes.feedback, isLoading: false } : null
      );
    } catch {
      // On timeout/failure show the recommendation reason as fallback
      setAiCoach((prev) =>
        prev ? { ...prev, feedback: recommendation.reason, isLoading: false } : null
      );
    }
  }

  function adjustNextSet(exerciseIdx: number, currentSetNumber: number, weight?: number, reps?: number) {
    const exercise = exercises[exerciseIdx];
    if (!exercise) return;
    const nextSetNumber = currentSetNumber + 1;
    const nextKey = `${exerciseIdx}-${nextSetNumber}`;
    const nextState = setStates[nextKey];
    if (!nextState || nextState.logged) return;
    setSetStates((prev) => ({
      ...prev,
      [nextKey]: {
        ...prev[nextKey],
        ...(weight != null ? { actualWeight: String(weight) } : {}),
        ...(reps != null ? { actualReps: String(reps) } : {}),
      },
    }));
    Toast.show({ type: 'success', text1: 'Next set updated', visibilityTime: 1500 });
  }

  function buildSetPayload(
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    unit: string,
    state: SetState
  ) {
    return {
      exerciseId,
      exerciseName,
      setNumber,
      actualReps: state.actualReps ? parseInt(state.actualReps, 10) : undefined,
      actualWeight: state.actualWeight ? parseFloat(state.actualWeight) : undefined,
      unit,
      rpe: state.rpe ?? undefined,
    };
  }

  async function submitPendingSets() {
    const pendingRequests: Promise<unknown>[] = [];

    exercises.forEach((exercise, ei) => {
      const skipKey = `planned-${ei}`;
      if (skippedExercises.has(skipKey)) return;

      exercise.sets.forEach((set) => {
        const key = `${ei}-${set.setNumber}`;
        const state = setStates[key];
        if (!state || state.logged || !state.actualReps || state.actualReps.trim() === '') return;

        pendingRequests.push(
          submitSet(buildSetPayload(skipKey, exercise.name, set.setNumber, set.unit, state))
        );
      });
    });

    extraExercises.forEach((exercise, xi) => {
      const prefix = `extra-${xi}`;
      for (let si = 0; si < exercise.sets; si++) {
        const setNumber = si + 1;
        const key = `${prefix}-${setNumber}`;
        const state = setStates[key];
        if (!state || state.logged || !state.actualReps || state.actualReps.trim() === '') continue;

        pendingRequests.push(
          submitSet(buildSetPayload(key, exercise.name, setNumber, exercise.unit, state))
        );
      }
    });

    if (pendingRequests.length === 0) return;

    await Promise.all(pendingRequests);
    setSetStates((prev) => {
      const next = { ...prev };

      Object.entries(next).forEach(([key, state]) => {
        if (state.actualReps && state.actualReps.trim() !== '') {
          next[key] = { ...state, logged: true };
        }
      });

      return next;
    });
  }

  async function handleComplete() {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      await submitPendingSets();

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

      const loggedCount = Object.values(setStates).filter((s) => s.logged).length;
      const durationSecs = res.session.startedAt && res.session.completedAt
        ? Math.round((new Date(res.session.completedAt).getTime() - new Date(res.session.startedAt).getTime()) / 1000)
        : 0;
      router.replace(
        `/(app)/workouts/celebration?sessionId=${sessionId}&sessionName=${encodeURIComponent(res.session.name)}&setsLogged=${loggedCount}&duration=${durationSecs}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete workout';
      Toast.show({ type: 'error', text1: 'Failed to complete workout', text2: message });
      setIsCompleting(false);
    }
  }

  if (isLoading) return <Spinner fullScreen />;

  const exercises = plannedWorkout?.exercises ?? [];

  // ── Derived summary stats (recomputed each render) ─────────────────────
  const completedSets = Object.values(setStates).filter((s) => s.logged).length;
  const totalSets =
    exercises.reduce((sum, ex) => sum + ex.sets.length, 0) +
    extraExercises.reduce((sum, ex) => sum + ex.sets, 0);
  const totalVolume = Object.values(setStates)
    .filter((s) => s.logged)
    .reduce((sum, s) => {
      const w = parseFloat(s.actualWeight) || 0;
      const r = parseInt(s.actualReps, 10) || 0;
      return sum + w * r;
    }, 0);
  const elapsedMins = Math.floor(elapsedSecs / 60);
  const elapsedDisplay =
    elapsedMins >= 60
      ? `${Math.floor(elapsedMins / 60)}h ${elapsedMins % 60}m`
      : `${elapsedMins}m`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Exit Workout', 'Your progress is saved. Exit anyway?', [
            { text: 'Continue', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: goHome },
          ]);
        }}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {plannedWorkout?.name ?? session?.name ?? 'Workout'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/workouts/active/chat?sessionId=${sessionId}`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPlateCalc(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="barbell-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTimerSettings(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="timer-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {liveMetrics.status !== 'unsupported' && (
        <View style={styles.liveMetricsStrip}>
          <View style={styles.liveMetricsHeader}>
            <Ionicons
              name={liveMetrics.status === 'live' ? 'heart' : 'heart-outline'}
              size={14}
              color={liveMetrics.status === 'live' ? theme.colors.danger : theme.colors.textSecondary}
            />
            <Text style={styles.liveMetricsTitle}>{formatLiveMetricStatus(liveMetrics)}</Text>
          </View>
          <View style={styles.liveMetricsValues}>
            <Text style={styles.liveMetricsValue}>
              {liveMetrics.heartRate != null ? `${liveMetrics.heartRate} bpm` : '-- bpm'}
            </Text>
            <Text style={styles.liveMetricsDivider}>·</Text>
            <Text style={styles.liveMetricsValue}>
              {liveMetrics.activeEnergyBurned != null ? `${liveMetrics.activeEnergyBurned} kcal` : '-- kcal'}
            </Text>
            {formatHeartRateTrend(liveMetrics.heartRateTrend) && (
              <>
                <Text style={styles.liveMetricsDivider}>·</Text>
                <Text style={styles.liveMetricsTrend}>
                  {formatHeartRateTrend(liveMetrics.heartRateTrend)}
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {showWatchReminder && (
        <View style={styles.watchReminderStrip}>
          <Ionicons name="watch-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.watchReminderText}>
            Using your Apple Watch too? Start the workout on your watch so Average Joe&apos;s can use that data during this session.
          </Text>
        </View>
      )}

      {/* Warmup strip */}
      {plannedWorkout?.warmup && plannedWorkout.warmup.length > 0 && (
        <View style={styles.warmupStrip}>
          <Ionicons name="flame-outline" size={14} color={theme.colors.warning} />
          <Text style={styles.warmupText} numberOfLines={1}>
            Warmup: {plannedWorkout.warmup.map((w) => w.name).join(' · ')}
          </Text>
        </View>
      )}

      {/* Rest timer banner — tap to open full-screen modal */}
      {restTimer.isActive && (
        <TouchableOpacity style={styles.timerBanner} onPress={() => setShowRestModal(true)} activeOpacity={0.8}>
          <Ionicons name="timer-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.timerText}>Rest — {restTimer.remaining}s  •  tap to expand</Text>
          <TouchableOpacity onPress={restTimer.stop} style={styles.timerSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.timerSkipText}>Skip</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── Exercise progress strip ──────────────────────────────────── */}
      {exercises.length > 0 && (
        <View style={styles.progressStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.progressStripContent}
          >
            {exercises.map((exercise, ei) => {
              const skipKey = `planned-${ei}`;
              const isSkipped = skippedExercises.has(skipKey);
              const setKeys = exercise.sets.map((s) => `${ei}-${s.setNumber}`);
              const loggedCount = setKeys.filter((k) => setStates[k]?.logged).length;
              const isDone = isSkipped || loggedCount === exercise.sets.length;
              const isInProgress = !isDone && loggedCount > 0;

              return (
                <View
                  key={ei}
                  style={[
                    styles.progressPill,
                    isDone && styles.progressPillDone,
                    isInProgress && styles.progressPillActive,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                  ) : isInProgress ? (
                    <View style={styles.progressDotActive} />
                  ) : (
                    <View style={styles.progressDot} />
                  )}
                  <Text
                    style={[
                      styles.progressPillName,
                      isDone && styles.progressPillNameDone,
                      isInProgress && styles.progressPillNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {exercise.name}
                  </Text>
                  <Text style={styles.progressPillMeta}>
                    {loggedCount}/{exercise.sets.length}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {exercises.map((exercise, ei) => {
            const skipKey = `planned-${ei}`;
            const isSkipped = skippedExercises.has(skipKey);
            const prevSets = lastSessionData[exercise.name];
            return (
              <React.Fragment key={ei}>
              <Card style={isSkipped ? { ...styles.exerciseCard, ...styles.exerciseCardSkipped } : styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, isSkipped && styles.exerciseNameSkipped]}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => toggleSkip(skipKey)} style={styles.skipBtn}>
                    <Text style={styles.skipBtnText}>{isSkipped ? 'Undo' : 'Skip'}</Text>
                  </TouchableOpacity>
                </View>

                {isSkipped ? (
                  <Text style={styles.skippedLabel}>Skipped</Text>
                ) : (
                  <>
                    {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}

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
                      const hasReps = !!state.actualReps && state.actualReps.trim() !== '';
                      return (
                        <View key={set.setNumber} style={[styles.setRow, state.logged && styles.setRowDone]}>
                          <Text style={[styles.colSet, styles.setNum]}>{set.setNumber}</Text>
                          <Text style={[styles.colTarget, styles.setTarget]}>
                            {formatTarget(set, userProfile)}
                          </Text>
                          <TextInput
                            style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                            value={state.actualReps}
                            onChangeText={(v) => updateSetField(key, 'actualReps', v)}
                            placeholder={set.targetReps?.toString() ?? '—'}
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="number-pad"
                            editable={!state.logged}
                            testID={`reps-input-${ei}-${set.setNumber}`}
                          />
                          <TextInput
                            style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                            value={state.actualWeight}
                            onChangeText={(v) => updateSetField(key, 'actualWeight', v)}
                            placeholder={set.targetWeight?.toString() ?? '0'}
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="decimal-pad"
                            editable={!state.logged}
                            testID={`weight-input-${ei}-${set.setNumber}`}
                          />
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
                          {/* Per-set Done button */}
                          {state.logged ? (
                            <View style={styles.doneCheck}>
                              <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.doneBtn, !hasReps && styles.doneBtnDisabled]}
                              onPress={() => {
                                if (!hasReps) return;
                                handleLogSet(
                                  `planned-${ei}`,
                                  ei,
                                  false,
                                  exercise.name,
                                  set.setNumber,
                                  set.unit,
                                  set.targetReps ?? undefined,
                                  set.targetReps ?? undefined
                                );
                              }}
                              disabled={!hasReps}
                              testID={`done-btn-${ei}-${set.setNumber}`}
                            >
                              <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </Card>

              {/* AI Coach Card — shown after the exercise where the last set was logged */}
              {aiCoach && !aiCoach.isExtra && aiCoach.exerciseIdx === ei && (
                <AICoachCard
                  feedback={aiCoach.feedback}
                  recommendation={aiCoach.recommendation}
                  onMoreRest={() => restTimer.addTime(30)}
                  onAdjustNext={(weight, reps) => {
                    const currentSetNumber = exercises[ei]?.sets.findIndex(
                      (_, si) => {
                        const k = `${ei}-${si + 1}`;
                        return setStates[k]?.logged;
                      }
                    );
                    // find the highest logged set number
                    const loggedSetNumbers = exercises[ei]?.sets
                      .map((s) => s.setNumber)
                      .filter((sn) => setStates[`${ei}-${sn}`]?.logged) ?? [];
                    const lastLogged = loggedSetNumbers.length > 0 ? Math.max(...loggedSetNumbers) : 0;
                    adjustNextSet(ei, lastLogged, weight, reps);
                  }}
                  onDismiss={() => setAiCoach(null)}
                />
              )}
            </React.Fragment>
            );
          })}

          {/* User-added extra exercises */}
          {extraExercises.map((ex, xi) => {
            const prefix = `extra-${xi}`;
            return (
              <Card key={prefix} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <View style={styles.addedBadge}><Text style={styles.addedBadgeText}>Added</Text></View>
                </View>
                <View style={styles.setHeader}>
                  <Text style={[styles.colLabel, styles.colSet]}>Set</Text>
                  <Text style={[styles.colLabel, styles.colTarget]}>Target</Text>
                  <Text style={[styles.colLabel, styles.colInput]}>Reps</Text>
                  <Text style={[styles.colLabel, styles.colInput]}>Weight</Text>
                  <Text style={[styles.colLabel, styles.colRpe]}>RPE</Text>
                </View>
                {Array.from({ length: ex.sets }, (_, si) => {
                  const key = `${prefix}-${si + 1}`;
                  const state = setStates[key] ?? { actualReps: '', actualWeight: '', rpe: null, logged: false };
                  return (
                    <View key={key} style={[styles.setRow, state.logged && styles.setRowDone]}>
                      <Text style={[styles.colSet, styles.setNum]}>{si + 1}</Text>
                      <Text style={[styles.colTarget, styles.setTarget]}>{ex.targetReps ? `${ex.targetReps}r` : ''}</Text>
                      <TextInput
                        style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                        value={state.actualReps}
                        onChangeText={(v) => updateSetField(key, 'actualReps', v)}
                        placeholder={ex.targetReps?.toString() ?? '—'}
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="number-pad"
                        editable={!state.logged}
                      />
                      <TextInput
                        style={[styles.inlineInput, styles.colInput, state.logged && styles.inlineInputDone]}
                        value={state.actualWeight}
                        onChangeText={(v) => updateSetField(key, 'actualWeight', v)}
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="decimal-pad"
                        editable={!state.logged}
                      />
                      <TouchableOpacity
                        style={[styles.rpePill, !!state.rpe && styles.rpePillActive]}
                        onPress={() => { if (!state.logged) setRpePickerKey(key); }}
                        disabled={state.logged}
                      >
                        <Text style={[styles.rpePillText, !!state.rpe && styles.rpePillTextActive]}>{state.rpe ?? '—'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </Card>
            );
          })}

          {/* Add exercise button */}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowAddExercise(true)}>
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
          </TouchableOpacity>

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

      <WorkoutSummaryBar
        totalVolume={totalVolume}
        completedSets={completedSets}
        totalSets={totalSets}
        elapsedDisplay={elapsedDisplay}
        restTimerActive={restTimer.isActive}
        restTimerRemaining={restTimer.remaining}
        onRestTimerPress={() => (restTimer.isActive ? setShowRestModal(true) : restTimer.start())}
      />

      {/* Floating notes FAB */}
      <TouchableOpacity
        style={styles.fab}
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

      {/* ── Plate Calculator ───────────────────────────────────────── */}
      <PlateCalculatorModal visible={showPlateCalc} onClose={() => setShowPlateCalc(false)} />

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

      {/* ── Full-screen Rest Timer ─────────────────────────────────── */}
      <RestTimerModal
        visible={showRestModal}
        remaining={restTimer.remaining}
        totalDuration={restTotalDuration}
        exerciseName={restExerciseName}
        setInfo={restSetInfo}
        aiTip={restAiTip}
        onAddTime={(secs) => restTimer.addTime(secs)}
        onClose={() => setShowRestModal(false)}
      />

      {/* ── Add Exercise modal ─────────────────────────────────────── */}
      <Modal visible={showAddExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Add Exercise</Text>
                <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.addExInput}
                placeholder="Exercise name"
                placeholderTextColor={theme.colors.textMuted}
                value={newExName}
                onChangeText={setNewExName}
                autoFocus
                autoCapitalize="words"
              />
              <View style={styles.addExRow}>
                <View style={styles.addExField}>
                  <Text style={styles.addExLabel}>Sets</Text>
                  <TextInput
                    style={styles.addExInput}
                    value={newExSets}
                    onChangeText={setNewExSets}
                    keyboardType="number-pad"
                    placeholder="3"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.addExField}>
                  <Text style={styles.addExLabel}>Target Reps (optional)</Text>
                  <TextInput
                    style={styles.addExInput}
                    value={newExReps}
                    onChangeText={setNewExReps}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddExercise(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, !newExName.trim() && styles.modalBtnDisabled]}
                  onPress={confirmAddExercise}
                  disabled={!newExName.trim()}
                >
                  <Text style={styles.confirmBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  liveMetricsStrip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 4,
  },
  liveMetricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveMetricsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  liveMetricsValues: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  liveMetricsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  liveMetricsDivider: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  liveMetricsTrend: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  watchReminderStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  watchReminderText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
  },
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
  // Exercise progress strip
  progressStrip: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  progressStripContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    maxWidth: 140,
  },
  progressPillDone: {
    borderColor: theme.colors.success + '50',
    backgroundColor: theme.colors.success + '10',
  },
  progressPillActive: {
    borderColor: theme.colors.primary + '60',
    backgroundColor: theme.colors.primaryLight,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  progressPillName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  progressPillNameDone: {
    color: theme.colors.success,
  },
  progressPillNameActive: {
    color: theme.colors.primary,
  },
  progressPillMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  // Content
  content: { padding: 16, gap: 12, paddingBottom: 160 },
  exerciseCard: { gap: 10 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  exerciseNotes: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  // Previous session row
  prevRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  prevText: { fontSize: 11, color: theme.colors.textMuted, flex: 1 },
  // Set table
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  colLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase' },
  colSet: { width: 30 },
  colTarget: { flex: 1, paddingRight: 8 },
  colInput: { width: 64, textAlign: 'center' },
  colRpe: { width: 42, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  setRowDone: { opacity: 0.55 },
  setNum: { fontSize: 13, color: theme.colors.textSecondary },
  setTarget: { fontSize: 12, color: theme.colors.textMuted },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exerciseCardSkipped: { opacity: 0.5 },
  exerciseNameSkipped: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  skipBtnText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  skippedLabel: { fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic' },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary + '60', borderStyle: 'dashed' },
  addExerciseBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  addedBadge: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  addedBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  addExInput: { backgroundColor: theme.colors.surfaceHover, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text, fontSize: 15 },
  addExRow: { flexDirection: 'row', gap: 12 },
  addExField: { flex: 1, gap: 6 },
  addExLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  inlineInput: {
    backgroundColor: theme.colors.surfaceHover,
    borderWidth: 1.5,
    borderColor: theme.colors.primary + '50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    height: 44,
  },
  inlineInputDone: { borderColor: theme.colors.success + '60', color: theme.colors.success },
  rpePill: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  rpePillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  rpePillText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  rpePillTextActive: { color: theme.colors.primary },
  colDone: { width: 46 },
  doneBtn: { width: 46, height: 36, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  doneBtnDisabled: { backgroundColor: theme.colors.border },
  doneBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  doneCheck: { width: 46, alignItems: 'center', justifyContent: 'center' },
  condCard: { gap: 8 },
  condHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  condTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  condDesc: { fontSize: 14, color: theme.colors.text },
  condMeta: { fontSize: 12, color: theme.colors.textSecondary },
  finishBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  finishBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  summaryValueMuted: { fontSize: 14, fontWeight: '400', color: theme.colors.textMuted },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  summaryTimerBtn: { width: 52, height: 40, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 },
  summaryTimerBtnActive: { borderColor: theme.colors.primary + '60', backgroundColor: theme.colors.primaryLight },
  summaryTimerText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  // FAB
  fab: { position: 'absolute', bottom: 150, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
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
