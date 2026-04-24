import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useProgram } from '@/hooks/useProgram';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';
import type { PlannedWorkout, WeeklyAnalysis } from '@/types';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProgramScreen() {
  const { user, refreshUser } = useAuth();

  // Refresh user on every visit so hasAnthropicKey/hasOpenAiKey is always current
  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
    }, [refreshUser])
  );
  const router = useRouter();
  const { generateProgram, isGenerating, error } = useProgram();
  const { program, isLoading, reload, currentWeekWorkouts } = useActiveProgram();
  const { startProgramWorkout } = useSession();
  const [analyses, setAnalyses] = useState<WeeklyAnalysis[]>([]);
  const [analyzingWeek, setAnalyzingWeek] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [customization, setCustomization] = useState('');
  // undefined = not yet fetched, null = fetch failed/no profile, object = loaded
  const [trainingProfile, setTrainingProfile] = useState<Record<string, unknown> | null | undefined>(undefined);

  const handleStartWorkout = async (plannedWorkout: PlannedWorkout) => {
    if (!program) return;
    setStartingWorkoutId(plannedWorkout.id);
    try {
      const session = await startProgramWorkout(plannedWorkout, program.id);
      router.push(`/(app)/workouts/active/${session.id}`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setStartingWorkoutId(null);
    }
  };

  const hasAiProvider = !!(user?.serverHasAiKey || user?.hasAnthropicKey || user?.hasOpenAiKey);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  useEffect(() => {
    if (program) {
      loadAnalyses();
    }
  }, [program]);

  const loadAnalyses = async () => {
    if (!program) return;
    try {
      const res = await api.get<{ analyses: WeeklyAnalysis[] }>(`/api/analysis/programs/${program.id}`);
      setAnalyses(res.analyses);
    } catch {}
  };

  const handleGenerate = () => {
    setCustomization('');
    setTrainingProfile(undefined); // reset to loading state
    setShowGenerateModal(true);
    // Fetch training profile for review in the modal
    api.get<{ profile: Record<string, unknown> }>('/api/profile/me')
      .then((res) => setTrainingProfile(res.profile ?? null))
      .catch(() => setTrainingProfile(null));
  };

  function formatGoalLabel(val: string | undefined): string {
    if (!val) return 'Not set';
    return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function buildProfileSummary(): string | null {
    if (!trainingProfile) return null;
    const p = trainingProfile;
    const lines: string[] = [];
    if (p.primaryGoal) lines.push(`Goal: ${formatGoalLabel(p.primaryGoal as string)}`);
    if (p.experienceLevel) lines.push(`Level: ${formatGoalLabel(p.experienceLevel as string)}`);
    if (p.daysPerWeek) lines.push(`${p.daysPerWeek} days/week`);
    if (p.sessionDurationMins) lines.push(`${p.sessionDurationMins} min sessions`);
    if (p.preferredSplit) lines.push(`Split: ${formatGoalLabel(p.preferredSplit as string)}`);
    if (p.workoutEnvironment) lines.push(`Env: ${formatGoalLabel(p.workoutEnvironment as string)}`);
    return lines.length > 0 ? lines.join('  ·  ') : null;
  }

  const confirmGenerate = async () => {
    setShowGenerateModal(false);
    try {
      await generateProgram(customization.trim() || undefined);
      await reload();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleAnalyzeWeek = async () => {
    if (!program) return;
    setAnalyzingWeek(true);
    try {
      const res = await api.post<{ analysis: WeeklyAnalysis }>(
        `/api/analysis/programs/${program.id}/analyze-week`,
        { weekNumber: program.currentWeek }
      );
      setAnalyses((prev) => [...prev.filter((a) => a.weekNumber !== res.analysis.weekNumber), res.analysis]);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAnalyzingWeek(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  const weekWorkouts = currentWeekWorkouts();
  const currentAnalysis = analyses.find((a) => a.weekNumber === program?.currentWeek);
  const allWorkoutsDone = weekWorkouts.length > 0 && weekWorkouts.every((w) => w.isCompleted);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>My Program</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/(app)/programs/browse')}
            >
              <Ionicons name="earth-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.browseBtnText}>Browse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <><Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                  <Text style={styles.generateBtnText}>Generate</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>


        {!program ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No active program</Text>
            <Text style={styles.emptySubtitle}>Generate a personalized AI program or pick one from the community.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleGenerate} disabled={isGenerating}>
              {isGenerating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.emptyBtnText}>Generate My Program</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyBrowseBtn}
              onPress={() => router.push('/(app)/programs/browse')}
            >
              <Ionicons name="earth-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.emptyBrowseBtnText}>Browse Community Programs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Program header */}
            <View style={styles.programCard}>
              <View style={styles.programCardTop}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{program.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.weekLabel}>Week {program.currentWeek} of {program.totalWeeks}</Text>
              </View>
              <Text style={styles.programName} numberOfLines={2}>{program.name}</Text>
              {program.aiGoalSummary && (
                <Text style={styles.programSummary}>{program.aiGoalSummary}</Text>
              )}
              {/* Week progress */}
              <View style={styles.weekProgressTrack}>
                <View style={[styles.weekProgressFill, { width: `${(program.currentWeek / program.totalWeeks) * 100}%` }]} />
              </View>
            </View>

            {/* Next Workout */}
            {(() => {
              const nextWorkout = weekWorkouts.find((w) => !w.isCompleted);
              if (!nextWorkout) return null;
              const starting = startingWorkoutId === nextWorkout.id;
              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Up Next</Text>
                  <TouchableOpacity
                    style={nextStyles.card}
                    onPress={() => handleStartWorkout(nextWorkout)}
                    disabled={!!startingWorkoutId}
                    activeOpacity={0.85}
                  >
                    <View style={nextStyles.cardTop}>
                      <Text style={nextStyles.day}>{nextWorkout.dayOfWeek}</Text>
                      {nextWorkout.estimatedDuration && (
                        <View style={nextStyles.durBadge}>
                          <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                          <Text style={nextStyles.durText}>{nextWorkout.estimatedDuration} min</Text>
                        </View>
                      )}
                    </View>
                    <Text style={nextStyles.name}>{nextWorkout.name}</Text>
                    {nextWorkout.focus && <Text style={nextStyles.focus}>{nextWorkout.focus}</Text>}
                    <Text style={nextStyles.exerciseCount}>{nextWorkout.exercises.length} exercises</Text>
                    <View style={nextStyles.startBtn}>
                      {starting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><Ionicons name="play" size={14} color="#fff" /><Text style={nextStyles.startBtnText}>Start Now</Text></>
                      }
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* This week's schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Week {program.currentWeek} Schedule</Text>
              {weekWorkouts.length === 0
                ? <Text style={styles.emptySubtitle}>No workouts scheduled this week.</Text>
                : DAY_ORDER.filter((d) => weekWorkouts.some((w) => w.dayOfWeek === d)).map((day) => {
                    const pw = weekWorkouts.find((w) => w.dayOfWeek === day);
                    if (!pw) return null;
                    return (
                      <PlannedWorkoutCard
                        key={pw.id}
                        workout={pw}
                        onStart={pw.isCompleted ? undefined : () => handleStartWorkout(pw)}
                        isStarting={startingWorkoutId === pw.id}
                      />
                    );
                  })
              }
            </View>

            {/* Weekly analysis */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Week Analysis</Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      'Week Analysis',
                      'Uses AI to review your completed sets for the week, calculate adherence and fatigue, and generate personalised recommendations for next week.\n\nTap "Analyze Week" after completing your workouts.',
                      [{ text: 'Got it' }]
                    )}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.analyzeBtn, (!allWorkoutsDone || analyzingWeek) && styles.analyzeBtnDisabled]}
                  onPress={allWorkoutsDone ? handleAnalyzeWeek : undefined}
                  disabled={!allWorkoutsDone || analyzingWeek}
                >
                  {analyzingWeek
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Text style={[styles.analyzeBtnText, !allWorkoutsDone && styles.analyzeBtnTextDisabled]}>Analyze Week</Text>
                  }
                </TouchableOpacity>
              </View>
              {currentAnalysis
                ? <AnalysisCard analysis={currentAnalysis} />
                : <Text style={styles.emptySubtitle}>No analysis yet for week {program.currentWeek}. Complete your workouts and tap "Analyze Week".</Text>
              }
            </View>
          </>
        )}
      </ScrollView>

      {/* Generate Program Modal */}
      <Modal visible={showGenerateModal} transparent animationType="slide">
        <View style={styles.genOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.genCard}>
              <Text style={styles.genTitle}>Generate My Program</Text>
              <Text style={styles.genSubtitle}>
                AI will build a 4-week program from your profile using proven templates.
                {program ? ' Your current program will be archived.' : ''}
              </Text>

              {/* Training profile summary */}
              {trainingProfile === undefined ? (
                // Loading
                <View style={styles.genProfile}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : trainingProfile === null ? (
                // Failed / no profile set
                <View style={styles.genProfileEmpty}>
                  <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.genProfileEmptyText}>
                    No training profile yet.{' '}
                    <Text style={styles.genProfileEdit} onPress={() => { setShowGenerateModal(false); router.push('/(onboarding)/'); }}>
                      Set yours →
                    </Text>
                  </Text>
                </View>
              ) : (
                // Loaded
                <View style={styles.genProfile}>
                  <View style={styles.genProfileHeader}>
                    <Text style={styles.genProfileLabel}>Your Training Profile</Text>
                    <TouchableOpacity onPress={() => { setShowGenerateModal(false); router.push('/(onboarding)/?edit=1'); }}>
                      <Text style={styles.genProfileEdit}>Edit →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.genProfileText}>{buildProfileSummary() ?? 'Profile incomplete — tap Edit to fill it in.'}</Text>
                </View>
              )}

              {!hasAiProvider && (
                <TouchableOpacity
                  style={styles.genKeyWarning}
                  onPress={() => { setShowGenerateModal(false); router.push('/(app)/profile'); }}
                >
                  <Ionicons name="key-outline" size={14} color={theme.colors.warning} />
                  <Text style={styles.genKeyWarningText}>
                    No AI key detected — tap to add one in Profile, or it will use the server key if available.
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.genInputLabel}>Customization (optional)</Text>
              <TextInput
                style={styles.genInput}
                placeholder="e.g. I have a bad shoulder, prefer dumbbells, want more cardio…"
                placeholderTextColor={theme.colors.textMuted}
                value={customization}
                onChangeText={setCustomization}
                multiline
                numberOfLines={3}
              />

              <View style={styles.genButtons}>
                <TouchableOpacity style={styles.genCancel} onPress={() => setShowGenerateModal(false)}>
                  <Text style={styles.genCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.genConfirm} onPress={confirmGenerate}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.genConfirmText}>Generate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PlannedWorkoutCard({
  workout,
  onStart,
  isStarting,
}: {
  workout: PlannedWorkout;
  onStart?: () => void;
  isStarting?: boolean;
}) {
  return (
    <View style={[cardStyles.card, workout.isCompleted && cardStyles.cardDone]}>
      <View style={cardStyles.cardLeft}>
        <View style={[cardStyles.dayDot, workout.isCompleted && cardStyles.dayDotDone]}>
          {workout.isCompleted
            ? <Ionicons name="checkmark" size={14} color={theme.colors.success} />
            : <Ionicons name="fitness-outline" size={14} color={theme.colors.textMuted} />
          }
        </View>
      </View>
      <View style={cardStyles.cardBody}>
        <Text style={[cardStyles.dayLabel, workout.isCompleted && cardStyles.dayLabelDone]}>
          {workout.dayOfWeek}
        </Text>
        <Text style={cardStyles.workoutName} numberOfLines={2}>{workout.name}</Text>
        {workout.focus && <Text style={cardStyles.focus}>{workout.focus}</Text>}
        <Text style={cardStyles.meta}>
          {workout.exercises.length} exercises{workout.estimatedDuration ? ` · ${workout.estimatedDuration} min` : ''}
        </Text>
      </View>
      {onStart && (
        <TouchableOpacity style={cardStyles.startBtn} onPress={onStart} disabled={isStarting}>
          {isStarting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="play" size={16} color="#fff" />
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

function AnalysisCard({ analysis }: { analysis: WeeklyAnalysis }) {
  return (
    <View style={analysisStyles.card}>
      <View style={analysisStyles.scores}>
        <View style={analysisStyles.scoreBlock}>
          <Text style={analysisStyles.scoreValue}>{Math.round(analysis.adherenceScore)}%</Text>
          <Text style={analysisStyles.scoreLabel}>Adherence</Text>
        </View>
        <View style={analysisStyles.scoreDivider} />
        <View style={analysisStyles.scoreBlock}>
          <Text style={analysisStyles.scoreValue}>{analysis.fatigueLevel}/10</Text>
          <Text style={analysisStyles.scoreLabel}>Fatigue</Text>
        </View>
      </View>
      {analysis.weekSummary && (
        <Text style={analysisStyles.summary}>{analysis.weekSummary}</Text>
      )}
      {(analysis.recommendations ?? []).length > 0 && (
        <View style={analysisStyles.recs}>
          {(analysis.recommendations ?? []).map((rec, i) => (
            <View key={i} style={analysisStyles.recRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={analysisStyles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  browseBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  generateBtnDisabled: { borderColor: theme.colors.border },
  generateBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  generateBtnTextDisabled: { color: theme.colors.textMuted },
  // AI banner
  aiBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  aiBannerText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  aiBannerLink: { color: theme.colors.primary, fontWeight: '600' },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyBrowseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary },
  emptyBrowseBtnText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
  // Program card
  programCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: theme.colors.border },
  programCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.colors.primaryLight, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  weekLabel: { fontSize: 13, color: theme.colors.textSecondary },
  programName: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  programSummary: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  weekProgressTrack: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  weekProgressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  // Section
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  analyzeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  analyzeBtnDisabled: { borderColor: theme.colors.border, opacity: 0.5 },
  analyzeBtnText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  analyzeBtnTextDisabled: { color: theme.colors.textMuted },
  // Generate modal
  genOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  genCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  genTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  genSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: -6 },
  genProfile: { backgroundColor: theme.colors.bg, borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: theme.colors.border },
  genProfileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  genProfileLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  genProfileEdit: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  genProfileText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  genProfileEmpty: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  genProfileEmptyText: { fontSize: 13, color: theme.colors.textMuted },
  genInputLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: -6 },
  genInput: { backgroundColor: theme.colors.bg, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text, fontSize: 14, minHeight: 72, textAlignVertical: 'top' },
  genButtons: { flexDirection: 'row', gap: 10 },
  genCancel: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  genCancelText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  genConfirm: { flex: 2, flexDirection: 'row', gap: 6, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  genConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  genKeyWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.warning + '40' },
  genKeyWarningText: { flex: 1, fontSize: 12, color: theme.colors.warning, lineHeight: 17 },
});

const cardStyles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  cardDone: { borderColor: theme.colors.success + '40', backgroundColor: theme.colors.surface },
  cardLeft: { paddingTop: 2 },
  dayDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  dayDotDone: { backgroundColor: theme.colors.successLight },
  cardBody: { flex: 1, gap: 2 },
  dayLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayLabelDone: { color: theme.colors.success },
  workoutName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  focus: { fontSize: 12, color: theme.colors.primary },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  startBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
});

const nextStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: theme.colors.primary + '60', gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  day: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  durBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durText: { fontSize: 11, color: theme.colors.textSecondary },
  name: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  focus: { fontSize: 13, color: theme.colors.primary },
  exerciseCount: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, marginTop: 6,
  },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const analysisStyles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.colors.border },
  scores: { flexDirection: 'row', alignItems: 'center' },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreValue: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  scoreLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  scoreDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  summary: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  recs: { gap: 8 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
