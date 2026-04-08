import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { api } from '@/lib/api';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import type { WorkoutSession } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { program, isLoading, reload, todayWorkout, currentWeekWorkouts, weekAdherence } = useActiveProgram();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
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
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          {program && (
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {program.currentWeek}/{program.totalWeeks}</Text>
            </View>
          )}
        </View>

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
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 15, color: theme.colors.textSecondary },
  name: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  weekBadge: { backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.border },
  weekBadgeText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
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
});
