import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { api } from '@/lib/api';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import type { WorkoutSession } from '@/types';

const REST_TIPS = [
  'Focus on sleep and hydration today.',
  'Foam roll or do 10 minutes of light stretching.',
  'Eat enough protein to support muscle recovery.',
  'A short walk boosts blood flow without adding stress.',
  'Mental rest matters as much as physical rest.',
  'Review last week and set clear intentions for tomorrow.',
  'Mobility work today pays dividends next session.',
];

function computeStreak(sessions: WorkoutSession[]): number {
  const completedDates = new Set(
    sessions
      .filter((s) => s.completedAt)
      .map((s) => new Date(s.completedAt!).toISOString().slice(0, 10))
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (completedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Allow today to be empty (streak still alive if yesterday had one)
      break;
    }
  }
  return streak;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { program, isLoading, reload, todayWorkout, currentWeekWorkouts, weekAdherence } = useActiveProgram();
  const [refreshing, setRefreshing] = useState(false);

  // Resume / streak / last workout state
  const [inProgressSession, setInProgressSession] = useState<WorkoutSession | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [streak, setStreak] = useState(0);

  async function loadSessionData() {
    try {
      const res = await api.get<{ sessions: WorkoutSession[]; total: number }>(
        '/api/sessions?limit=30'
      );
      const sessions = res.sessions ?? [];

      // In-progress = no completedAt
      const inProgress = sessions.find((s) => !s.completedAt) ?? null;
      setInProgressSession(inProgress);

      // Last completed
      const completed = sessions.filter((s) => s.completedAt);
      setLastSession(completed[0] ?? null);

      // Streak
      setStreak(computeStreak(sessions));
    } catch {
      // silent fail
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadSessionData();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([reload(), loadSessionData()]);
    setRefreshing(false);
  }

  const today = todayWorkout();
  const adherence = weekAdherence();
  const weekWorkouts = currentWeekWorkouts();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const startTodayWorkout = () => {
    if (!today) return;
    setShowDatePicker(true);
  };

  const handleDateConfirm = async (date: Date) => {
    if (!today) return;
    setShowDatePicker(false);
    try {
      const res = await api.post<{ session: WorkoutSession }>('/api/sessions', {
        name: today.name,
        plannedWorkoutId: today.id,
        programId: today.programId,
        startedAt: date.toISOString(),
      });
      router.push(`/(app)/workouts/active/${res.session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const repeatLastWorkout = async () => {
    if (!lastSession) return;
    try {
      const res = await api.post<{ session: WorkoutSession }>('/api/sessions', {
        name: lastSession.name,
        templateId: lastSession.templateId ?? undefined,
      });
      router.push(`/(app)/workouts/active/${res.session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Athlete';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Greeting + streak */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.greetingRight}>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakCount}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            )}
            {program && (
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>Week {program.currentWeek}/{program.totalWeeks}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Resume in-progress banner */}
        {inProgressSession && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() => router.push(`/(app)/workouts/active/${inProgressSession.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.resumeLeft}>
              <Ionicons name="play-circle" size={22} color={theme.colors.warning} />
              <View>
                <Text style={styles.resumeTitle}>Resume workout</Text>
                <Text style={styles.resumeName}>{inProgressSession.name}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.warning} />
          </TouchableOpacity>
        )}

        {/* No program CTA */}
        {!program && (
          <TouchableOpacity style={styles.setupCard} onPress={() => router.push('/(app)/program')}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.setupTitle}>Set up your training program</Text>
            <Text style={styles.setupSubtitle}>Complete onboarding and let AI build your personalized plan</Text>
            <View style={styles.setupCta}>
              <Text style={styles.setupCtaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Today's workout */}
        {program && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            {today ? (
              <View style={styles.workoutCard}>
                <View style={styles.workoutCardHeader}>
                  <View>
                    <Text style={styles.workoutName}>{today.name}</Text>
                    {today.focus && <Text style={styles.workoutFocus}>{today.focus}</Text>}
                  </View>
                  {today.estimatedDuration && (
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={styles.durationText}>{today.estimatedDuration} min</Text>
                    </View>
                  )}
                </View>

                {/* Exercise preview */}
                <View style={styles.exercisePreview}>
                  {today.exercises.slice(0, 4).map((ex, i) => (
                    <View key={i} style={styles.exerciseRow}>
                      <Text style={styles.exerciseDot}>•</Text>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseSets}>{ex.sets.length} sets</Text>
                    </View>
                  ))}
                  {today.exercises.length > 4 && (
                    <Text style={styles.moreExercises}>+{today.exercises.length - 4} more exercises</Text>
                  )}
                </View>

                {today.coachNotes && (
                  <Text style={styles.coachNotes}>{today.coachNotes}</Text>
                )}

                <TouchableOpacity style={styles.startButton} onPress={startTodayWorkout} activeOpacity={0.8}>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.startButtonText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.restDayCard}>
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                <Text style={styles.restDayTitle}>Rest Day</Text>
                <Text style={styles.restDaySubtitle}>No training scheduled today. Recover well.</Text>
                <Text style={styles.restDayTip}>{REST_TIPS[new Date().getDay() % REST_TIPS.length]}</Text>
                <TouchableOpacity
                  style={styles.customWorkoutBtn}
                  onPress={() => router.push('/(app)/workouts/new')}
                >
                  <Text style={styles.customWorkoutBtnText}>+ Custom Workout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* This week */}
        {program && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <Text style={styles.adherenceScore}>
                {adherence.completed}/{adherence.total} done
              </Text>
            </View>
            {/* Adherence bar */}
            <View style={styles.adherenceTrack}>
              <View
                style={[
                  styles.adherenceFill,
                  { width: adherence.total > 0 ? `${(adherence.completed / adherence.total) * 100}%` : '0%' },
                ]}
              />
            </View>
            {/* Day list */}
            <View style={styles.weekDays}>
              {weekWorkouts.map((pw) => (
                <View key={pw.id} style={[styles.dayPill, pw.isCompleted && styles.dayPillDone]}>
                  <Text style={[styles.dayPillDay, pw.isCompleted && styles.dayPillDayDone]}>
                    {pw.dayOfWeek.slice(0, 3)}
                  </Text>
                  {pw.isCompleted && <Ionicons name="checkmark" size={12} color={theme.colors.success} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(app)/workouts/new')}>
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Custom Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(app)/progress')}>
              <Ionicons name="trending-up-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>View Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(app)/program')}>
              <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>My Program</Text>
            </TouchableOpacity>
          </View>

          {/* Repeat last workout */}
          {lastSession && (
            <TouchableOpacity style={styles.repeatBtn} onPress={repeatLastWorkout} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.repeatBtnText}>Repeat: {lastSession.name}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: 24 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 15, color: theme.colors.textSecondary },
  name: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  greetingRight: { alignItems: 'flex-end', gap: 6 },
  weekBadge: { backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.border },
  weekBadgeText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.warning + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: theme.colors.warning + '50' },
  streakFire: { fontSize: 14 },
  streakCount: { fontSize: 14, fontWeight: '700', color: theme.colors.warning },
  streakLabel: { fontSize: 11, color: theme.colors.warning },
  // Resume banner
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.warning + '18',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.warning + '50',
  },
  resumeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumeTitle: { fontSize: 12, color: theme.colors.warning, fontWeight: '600' },
  resumeName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 1 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  // Setup card
  setupCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  setupTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 6 },
  setupSubtitle: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  setupCta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setupCtaText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  // Workout card
  workoutCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 14 },
  workoutCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  workoutName: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  workoutFocus: { fontSize: 13, color: theme.colors.primary, fontWeight: '500', marginTop: 2 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  durationText: { fontSize: 12, color: theme.colors.textSecondary },
  exercisePreview: { gap: 6 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseDot: { color: theme.colors.textMuted, fontSize: 16, width: 12 },
  exerciseName: { flex: 1, fontSize: 14, color: theme.colors.text },
  exerciseSets: { fontSize: 12, color: theme.colors.textSecondary },
  moreExercises: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  coachNotes: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', borderLeftWidth: 3, borderLeftColor: theme.colors.primary, paddingLeft: 10, lineHeight: 18 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Rest day
  restDayCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border },
  restDayTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  restDaySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  restDayTip: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 4, paddingHorizontal: 8 },
  customWorkoutBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  customWorkoutBtnText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  // Adherence
  adherenceScore: { fontSize: 13, color: theme.colors.textSecondary },
  adherenceTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  adherenceFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 3 },
  weekDays: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayPillDone: { borderColor: theme.colors.success, backgroundColor: theme.colors.successLight },
  dayPillDay: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  dayPillDayDone: { color: theme.colors.success },
  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, paddingVertical: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border },
  quickActionText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  // Repeat last workout
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  repeatBtnText: { flex: 1, fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
});
