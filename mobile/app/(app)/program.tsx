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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radii, typography, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useSession } from '@/hooks/useSession';
import { ProgramSummaryCard } from '@/components/program/ProgramSummaryCard';
import { ScheduledWorkoutRow } from '@/components/program/ScheduledWorkoutRow';
import { PastProgramCard } from '@/components/program/PastProgramCard';
import { ProgramSegmentedControl } from '@/components/program/ProgramSegmentedControl';
import type { PlannedWorkout, WeeklyAnalysis, Program } from '@/types';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TODAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

export default function ProgramScreen() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const showOnboardingPrompt = onboarding === '1';

  const { program, isLoading, reload } = useActiveProgram();
  const { startProgramWorkout } = useSession();

  const [tab, setTab] = useState<'current' | 'past'>('current');
  const [refreshing, setRefreshing] = useState(false);
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);
  const [actioningWorkoutId, setActioningWorkoutId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<WeeklyAnalysis[]>([]);
  const [analyzingWeek, setAnalyzingWeek] = useState(false);
  const [pastPrograms, setPastPrograms] = useState<Program[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
      reload();
    }, [refreshUser, reload])
  );

  // Sync selectedWeek when program loads
  useEffect(() => {
    if (program && selectedWeek === null) {
      setSelectedWeek(program.currentWeek);
    }
  }, [program]);

  useEffect(() => {
    if (program) loadAnalyses();
  }, [program]);

  useEffect(() => {
    if (tab === 'past') loadPastPrograms();
  }, [tab]);

  async function loadAnalyses() {
    if (!program) return;
    try {
      const res = await api.get<{ analyses: WeeklyAnalysis[] }>(`/api/analysis/programs/${program.id}`);
      setAnalyses(res.analyses);
    } catch {}
  }

  async function loadPastPrograms() {
    setPastLoading(true);
    try {
      const res = await api.get<{ programs: Program[] }>('/api/programs/past');
      setPastPrograms(res.programs ?? []);
    } catch {}
    finally { setPastLoading(false); }
  }

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    if (tab === 'past') await loadPastPrograms();
    setRefreshing(false);
  }

  async function handleStartWorkout(pw: PlannedWorkout) {
    if (!program) return;
    setStartingWorkoutId(pw.id);
    try {
      const session = await startProgramWorkout(pw, program.id);
      router.push(`/(app)/workouts/active/${session.id}`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setStartingWorkoutId(null);
    }
  }

  async function handleSkip(pw: PlannedWorkout) {
    setActioningWorkoutId(pw.id);
    try {
      await api.patch(`/api/programs/planned-workouts/${pw.id}/skip`, {});
      await reload();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setActioningWorkoutId(null);
    }
  }

  async function handleRestore(pw: PlannedWorkout) {
    setActioningWorkoutId(pw.id);
    try {
      await api.patch(`/api/programs/planned-workouts/${pw.id}/restore`, {});
      await reload();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setActioningWorkoutId(null);
    }
  }

  async function handleArchiveProgram() {
    if (!program) return;
    Alert.alert(
      'End Program',
      'Archive this program? Your workout history will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/api/programs/${program.id}/status`, { status: 'archived' });
              await reload();
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            }
          },
        },
      ]
    );
  }

  async function handleAnalyzeWeek() {
    if (!program) return;
    setAnalyzingWeek(true);
    try {
      const res = await api.post<{ analysis: WeeklyAnalysis }>(
        `/api/analysis/programs/${program.id}/analyze-week`,
        { weekNumber: program.currentWeek }
      );
      setAnalyses((prev) => [
        ...prev.filter((a) => a.weekNumber !== res.analysis.weekNumber),
        res.analysis,
      ]);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAnalyzingWeek(false);
    }
  }

  const displayWeek = selectedWeek ?? program?.currentWeek ?? 1;
  const weekWorkouts = program
    ? program.plannedWorkouts
        .filter((pw) => pw.weekNumber === displayWeek)
        .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))
    : [];
  const allDone = weekWorkouts.length > 0 && weekWorkouts.every((w) => w.isCompleted || w.isSkipped);
  const currentAnalysis = analyses.find((a) => a.weekNumber === program?.currentWeek);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>My Program</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(app)/programs/browse')}>
              <Ionicons name="earth-outline" size={16} color={colors.accent} />
              <Text style={styles.headerBtnText}>Browse</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnPrimary]} onPress={() => router.push('/(app)/workouts/build-program')}>
              <Ionicons name="construct-outline" size={16} color={colors.accent} />
              <Text style={styles.headerBtnText}>Build</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented control — only show if there's a current or past program */}
        {(program || pastPrograms.length > 0) && (
          <ProgramSegmentedControl value={tab} onChange={setTab} />
        )}

        {/* ── CURRENT TAB ─────────────────────────────────────────── */}
        {tab === 'current' && (
          <>
            {showOnboardingPrompt && !program && (
              <View style={styles.onboardingBanner}>
                <View style={styles.onboardingIconWrap}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.onboardingBody}>
                  <Text style={styles.onboardingTitle}>Choose your first program</Text>
                  <Text style={styles.onboardingText}>
                    Your goals are saved. Pick a community program or build one with AI to get started.
                  </Text>
                </View>
              </View>
            )}

            {!program ? (
              <EmptyProgramState />
            ) : (
              <>
                {/* Program summary card */}
                <ProgramSummaryCard program={program} onArchive={handleArchiveProgram} />

                {/* Week selector */}
                {program.totalWeeks > 1 && (
                  <WeekSelector
                    totalWeeks={program.totalWeeks}
                    currentWeek={program.currentWeek}
                    selectedWeek={displayWeek}
                    onSelect={setSelectedWeek}
                  />
                )}

                {/* Schedule */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Week {displayWeek} Schedule
                  </Text>
                  {weekWorkouts.length === 0 ? (
                    <Text style={styles.emptyText}>No workouts scheduled this week.</Text>
                  ) : (
                    <View style={styles.scheduleList}>
                      {weekWorkouts.map((pw) => (
                        <ScheduledWorkoutRow
                          key={pw.id}
                          workout={pw}
                          todayName={displayWeek === program.currentWeek ? TODAY_NAME : ''}
                          onStart={pw.isCompleted || pw.isSkipped ? undefined : () => handleStartWorkout(pw)}
                          onSkip={pw.isCompleted || pw.isSkipped ? undefined : () => handleSkip(pw)}
                          onRestore={pw.isSkipped ? () => handleRestore(pw) : undefined}
                          isStarting={startingWorkoutId === pw.id}
                          isActioning={actioningWorkoutId === pw.id}
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* Week analysis */}
                {displayWeek === program.currentWeek && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>Week Analysis</Text>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert(
                              'Week Analysis',
                              'AI reviews your completed sets for the week, calculates adherence and fatigue, and generates recommendations for next week.',
                              [{ text: 'Got it' }]
                            )
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={[styles.analyzeBtn, (!allDone || analyzingWeek) && styles.analyzeBtnDisabled]}
                        onPress={allDone ? handleAnalyzeWeek : undefined}
                        disabled={!allDone || analyzingWeek}
                      >
                        {analyzingWeek ? (
                          <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                          <Text style={[styles.analyzeBtnText, !allDone && styles.analyzeBtnTextMuted]}>
                            Analyze Week
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {currentAnalysis ? (
                      <AnalysisCard analysis={currentAnalysis} />
                    ) : (
                      <Text style={styles.emptyText}>
                        No analysis yet for week {program.currentWeek}. Complete your workouts and tap "Analyze Week".
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── PAST TAB ─────────────────────────────────────────────── */}
        {tab === 'past' && (
          <>
            {pastLoading ? (
              <View style={styles.centeredInline}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : pastPrograms.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="archive-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No past programs</Text>
                <Text style={styles.emptySubtitle}>Completed or archived programs will appear here.</Text>
              </View>
            ) : (
              <View style={styles.scheduleList}>
                {pastPrograms.map((p) => (
                  <PastProgramCard key={p.id} program={p as any} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function WeekSelector({
  totalWeeks,
  currentWeek,
  selectedWeek,
  onSelect,
}: {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  onSelect: (w: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.weekSelectorRow}
    >
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
        const isSelected = w === selectedWeek;
        const isCurrent = w === currentWeek;
        return (
          <TouchableOpacity
            key={w}
            style={[
              styles.weekChip,
              isSelected && styles.weekChipSelected,
              isCurrent && !isSelected && styles.weekChipCurrent,
            ]}
            onPress={() => onSelect(w)}
          >
            <Text
              style={[
                styles.weekChipText,
                isSelected && styles.weekChipTextSelected,
                isCurrent && !isSelected && styles.weekChipTextCurrent,
              ]}
            >
              W{w}
            </Text>
            {isCurrent && <View style={styles.weekChipDot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function EmptyProgramState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
      <Text style={styles.emptyTitle}>No active program</Text>
      <Text style={styles.emptySubtitle}>
        Generate a personalized AI program or pick one from the community.
      </Text>
      <TouchableOpacity style={styles.emptyPrimaryBtn} onPress={() => router.push('/(app)/workouts/build-program')}>
        <Ionicons name="sparkles-outline" size={16} color="#fff" />
        <Text style={styles.emptyPrimaryBtnText}>Generate with AI</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.emptySecondaryBtn} onPress={() => router.push('/(app)/programs/browse')}>
        <Ionicons name="earth-outline" size={16} color={colors.accent} />
        <Text style={styles.emptySecondaryBtnText}>Browse Programs</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.emptySecondaryBtn} onPress={() => router.push('/(app)/workouts/build-program')}>
        <Ionicons name="construct-outline" size={16} color={colors.accent} />
        <Text style={styles.emptySecondaryBtnText}>Build My Own</Text>
      </TouchableOpacity>
    </View>
  );
}

function AnalysisCard({ analysis }: { analysis: WeeklyAnalysis }) {
  return (
    <View style={analysisStyles.card}>
      <View style={analysisStyles.scores}>
        <View style={analysisStyles.scoreBlock}>
          <Text style={analysisStyles.scoreValue}>{Math.round(analysis.adherenceScore * 100)}%</Text>
          <Text style={analysisStyles.scoreLabel}>Adherence</Text>
        </View>
        <View style={analysisStyles.divider} />
        <View style={analysisStyles.scoreBlock}>
          <Text style={analysisStyles.scoreValue}>{analysis.fatigueLevel}/10</Text>
          <Text style={analysisStyles.scoreLabel}>Fatigue</Text>
        </View>
      </View>
      {analysis.weekSummary ? (
        <Text style={analysisStyles.summary}>{analysis.weekSummary}</Text>
      ) : null}
      {(analysis.recommendations ?? []).length > 0 && (
        <View style={analysisStyles.recs}>
          {(analysis.recommendations ?? []).map((rec, i) => (
            <View key={i} style={analysisStyles.recRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.accent} />
              <Text style={analysisStyles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centeredInline: { paddingVertical: 40, alignItems: 'center' },
  content: { padding: spacing.xl, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: spacing.lg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
  },
  headerBtnPrimary: { borderColor: colors.accent + '60' },
  headerBtnText: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  onboardingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: spacing.md, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  onboardingIconWrap: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  onboardingBody: { flex: 1, gap: 3 },
  onboardingTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  onboardingText: { fontSize: typography.xs, lineHeight: 18, color: colors.textSecondary },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },

  scheduleList: { gap: 8 },

  analyzeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.accent,
  },
  analyzeBtnDisabled: { borderColor: colors.border, opacity: 0.5 },
  analyzeBtnText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  analyzeBtnTextMuted: { color: colors.textMuted },

  // Week selector
  weekSelectorRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  weekChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  weekChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  weekChipCurrent: { borderColor: colors.accent + '60', backgroundColor: colors.accentLight },
  weekChipText: { fontSize: typography.xs, fontWeight: '600', color: colors.textSecondary },
  weekChipTextSelected: { color: '#fff' },
  weekChipTextCurrent: { color: colors.accent },
  weekChipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },

  emptyText: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: typography.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  emptyPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 13,
    backgroundColor: colors.accent, borderRadius: radii.lg,
  },
  emptyPrimaryBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  emptySecondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.accent + '60',
  },
  emptySecondaryBtnText: { color: colors.accent, fontWeight: '600', fontSize: typography.sm },
});

const analysisStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radii.xl,
    padding: spacing.lg, gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  scores: { flexDirection: 'row', alignItems: 'center' },
  scoreBlock: { flex: 1, alignItems: 'center', gap: 3 },
  scoreValue: { fontSize: 26, fontWeight: '700', color: colors.text },
  scoreLabel: { fontSize: 12, color: colors.textSecondary },
  divider: { width: 1, height: 40, backgroundColor: colors.border },
  summary: { fontSize: typography.sm, color: colors.text, lineHeight: 20 },
  recs: { gap: 8 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recText: { flex: 1, fontSize: typography.xs, color: colors.textSecondary, lineHeight: 18 },
});
