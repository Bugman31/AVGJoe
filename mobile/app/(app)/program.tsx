import React, { useEffect, useState } from 'react';
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
import { theme } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useProgram } from '@/hooks/useProgram';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useRouter } from 'expo-router';
import type { PlannedWorkout, WeeklyAnalysis } from '@/types';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProgramScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { generateProgram, isGenerating, error } = useProgram();
  const { program, isLoading, reload, currentWeekWorkouts } = useActiveProgram();
  const [analyses, setAnalyses] = useState<WeeklyAnalysis[]>([]);
  const [analyzingWeek, setAnalyzingWeek] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasAiProvider = !!(user?.hasAnthropicKey || user?.hasOpenAiKey);

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

  const handleGenerate = async () => {
    if (!hasAiProvider) {
      Alert.alert(
        'AI Provider Required',
        'Connect an AI provider to generate programs. Add your Anthropic (Claude) or OpenAI (ChatGPT) API key in Profile → AI Provider.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(app)/profile') },
        ]
      );
      return;
    }
    Alert.alert(
      'Generate New Program',
      'This will archive your current program and create a new one based on your profile. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              await generateProgram();
              await reload();
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            }
          },
        },
      ]
    );
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
          <TouchableOpacity
            style={[styles.generateBtn, !hasAiProvider && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : <><Ionicons name="sparkles" size={16} color={hasAiProvider ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.generateBtnText, !hasAiProvider && styles.generateBtnTextDisabled]}>New Program</Text></>
            }
          </TouchableOpacity>
        </View>

        {!program ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No active program</Text>
            {hasAiProvider ? (
              <>
                <Text style={styles.emptySubtitle}>Generate a personalized program based on your profile to get started.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={handleGenerate} disabled={isGenerating}>
                  {isGenerating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.emptyBtnText}>Generate My Program</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptySubtitle}>Connect an AI provider to generate a personalized program.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/profile')}>
                  <Text style={styles.emptyBtnText}>Connect AI Provider</Text>
                </TouchableOpacity>
              </>
            )}
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

            {/* This week's schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Week {program.currentWeek} Schedule</Text>
              {weekWorkouts.length === 0
                ? <Text style={styles.emptySubtitle}>No workouts scheduled this week.</Text>
                : DAY_ORDER.filter((d) => weekWorkouts.some((w) => w.dayOfWeek === d)).map((day) => {
                    const pw = weekWorkouts.find((w) => w.dayOfWeek === day);
                    if (!pw) return null;
                    return <PlannedWorkoutCard key={pw.id} workout={pw} />;
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
                  style={styles.analyzeBtn}
                  onPress={handleAnalyzeWeek}
                  disabled={analyzingWeek}
                >
                  {analyzingWeek
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Text style={styles.analyzeBtnText}>Analyze Week</Text>
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
    </SafeAreaView>
  );
}

function PlannedWorkoutCard({ workout }: { workout: PlannedWorkout }) {
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
      {analysis.recommendations.length > 0 && (
        <View style={analysisStyles.recs}>
          {analysis.recommendations.map((rec, i) => (
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
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  generateBtnDisabled: { borderColor: theme.colors.border },
  generateBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  generateBtnTextDisabled: { color: theme.colors.textMuted },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
  analyzeBtnText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
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
