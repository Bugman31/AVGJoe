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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';
import { useActiveSession } from '@/context/ActiveSessionContext';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { api } from '@/lib/api';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { SummaryHeroCard, NoProgramHeroCard } from '@/components/home/SummaryHeroCard';
import { WeeklyProgressCard } from '@/components/home/WeeklyProgressCard';
import { ReadinessCard } from '@/components/home/ReadinessCard';
import { RecentSessionRow } from '@/components/home/RecentSessionRow';
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

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { summary, isLoading, error, reload } = useDashboardSummary();
  const { setActiveSessionId } = useActiveSession();
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<{ id: string; name: string; programId?: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload])
  );

  // Keep the active session context in sync with the dashboard data.
  React.useEffect(() => {
    if (!isLoading) {
      setActiveSessionId(summary?.inProgressSession?.id ?? null);
    }
  }, [summary?.inProgressSession?.id, isLoading, setActiveSessionId]);

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  function handleStartWorkout() {
    const next = summary?.activeProgram?.nextWorkout;
    if (!next) return;
    setPendingWorkout({
      id: next.id,
      name: next.name,
      programId: summary?.activeProgram?.id,
    });
    setShowDatePicker(true);
  }

  async function handleDateConfirm(date: Date) {
    if (!pendingWorkout) return;
    setShowDatePicker(false);
    try {
      const res = await api.post<{ session: WorkoutSession }>('/api/sessions', {
        name: pendingWorkout.name,
        plannedWorkoutId: pendingWorkout.id,
        programId: pendingWorkout.programId,
        startedAt: date.toISOString(),
      });
      router.push(`/(app)/workouts/active/${res.session.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setPendingWorkout(null);
    }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Athlete';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !summary) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
          <Text style={styles.errorText}>Couldn't load dashboard</Text>
          <TouchableOpacity onPress={reload} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { activeProgram, streak, readiness, recentSessions, inProgressSession } = summary;


  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          {activeProgram && (
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>
                Week {activeProgram.currentWeek}/{activeProgram.totalWeeks}
              </Text>
            </View>
          )}
        </View>

        {/* Resume in-progress banner */}
        {inProgressSession && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() => router.push(`/(app)/workouts/active/${inProgressSession.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.resumeLeft}>
              <Ionicons name="play-circle" size={22} color={colors.warning} />
              <View>
                <Text style={styles.resumeTitle}>Resume workout</Text>
                <Text style={styles.resumeName}>{inProgressSession.name}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* Hero: today's workout or no-program state */}
        {activeProgram ? (
          <SummaryHeroCard program={activeProgram} onStartWorkout={handleStartWorkout} />
        ) : (
          <NoProgramHeroCard />
        )}

        {/* Readiness */}
        <ReadinessCard readiness={readiness} />

        {/* Weekly progress */}
        {activeProgram && (
          <WeeklyProgressCard
            adherence={activeProgram.weekAdherence}
            weekDays={activeProgram.weekDays}
            streak={streak}
          />
        )}

        {/* Rest-day tip when no workout and no program */}
        {!activeProgram && (
          <View style={styles.restTipCard}>
            <Ionicons name="leaf-outline" size={20} color={colors.success} />
            <Text style={styles.restTipText}>
              {REST_TIPS[new Date().getDay() % REST_TIPS.length]}
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/workouts/new')}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={styles.quickActionText}>Custom Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/progress')}
            >
              <Ionicons name="trending-up-outline" size={22} color={colors.accent} />
              <Text style={styles.quickActionText}>View Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/program')}
            >
              <Ionicons name="calendar-outline" size={22} color={colors.accent} />
              <Text style={styles.quickActionText}>My Program</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent activity */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/history')}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sessionList}>
              {recentSessions.map((s) => (
                <RecentSessionRow key={s.id} session={s} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        onConfirm={handleDateConfirm}
        onCancel={() => { setShowDatePicker(false); setPendingWorkout(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: spacing.xl, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: spacing.lg },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: typography.sm, color: colors.textSecondary },
  name: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 2 },
  weekBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  weekBadgeText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500' },

  // Resume banner
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning + '18',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '50',
  },
  resumeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumeTitle: { fontSize: typography.xs, color: colors.warning, fontWeight: '600' },
  resumeName: { fontSize: typography.sm, fontWeight: '700', color: colors.text, marginTop: 1 },

  // Rest tip
  restTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restTipText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Sections
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: typography.xs, color: colors.accent, fontWeight: '600' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Recent sessions
  sessionList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Error state
  errorText: { fontSize: typography.sm, color: colors.textSecondary },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontSize: typography.sm, color: colors.accent, fontWeight: '600' },
});
