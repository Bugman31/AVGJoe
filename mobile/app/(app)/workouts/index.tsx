import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { WorkoutCard } from '@/components/workouts/WorkoutCard';
import { Spinner } from '@/components/ui/Spinner';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useSession } from '@/hooks/useSession';
import { colors, spacing, typography, TAB_BAR_BOTTOM_INSET, radii } from '@/lib/theme';
import type { PlannedWorkout } from '@/types';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WorkoutsScreen() {
  const router = useRouter();
  const { workouts, isLoading, refetch } = useWorkouts();
  const { program, isLoading: isProgramLoading, reload: reloadProgram, currentWeekWorkouts, todayWorkout } = useActiveProgram();
  const { startProgramWorkout } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), reloadProgram()]);
    setRefreshing(false);
  }

  async function handleStartProgramWorkout(pw: PlannedWorkout) {
    if (!program) return;
    setStartingId(pw.id);
    try {
      const session = await startProgramWorkout(pw, program.id);
      router.push(`/(app)/workouts/active/${session.id}`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setStartingId(null);
    }
  }

  if (isLoading && isProgramLoading) return <Spinner fullScreen />;

  const weekWorkouts = program ? currentWeekWorkouts() : [];
  const today = todayWorkout();
  const sortedWeek = [...weekWorkouts].sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Button
          onPress={() => router.push('/workouts/new')}
          variant="primary"
          size="sm"
          testID="new-workout-btn"
        >
          + New
        </Button>
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard workout={item} testID={`workout-card-${item.id}`} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          program ? (
            <View style={styles.programSection}>
              {/* Program label */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {program.name} — Week {program.currentWeek}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(app)/program')}>
                  <Text style={styles.seeAll}>Full schedule →</Text>
                </TouchableOpacity>
              </View>

              {/* Today's workout highlight */}
              {today ? (
                <TouchableOpacity
                  style={styles.todayCard}
                  onPress={() => handleStartProgramWorkout(today)}
                  disabled={!!startingId}
                  activeOpacity={0.85}
                >
                  <View style={styles.todayTop}>
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>TODAY</Text>
                    </View>
                    {today.estimatedDuration ? (
                      <View style={styles.durRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.durText}>{today.estimatedDuration} min</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.todayName}>{today.name}</Text>
                  {today.focus ? <Text style={styles.todayFocus}>{today.focus}</Text> : null}
                  <Text style={styles.todayMeta}>{today.exercises.length} exercises</Text>
                  <View style={styles.startBtn}>
                    {startingId === today.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="play" size={14} color="#fff" /><Text style={styles.startBtnText}>Start Now</Text></>
                    }
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Rest of week */}
              {sortedWeek.filter((pw) => pw.id !== today?.id).map((pw) => (
                <View key={pw.id} style={[styles.weekRow, pw.isCompleted && styles.weekRowDone]}>
                  <View style={[styles.weekDot, pw.isCompleted && styles.weekDotDone]}>
                    {pw.isCompleted
                      ? <Ionicons name="checkmark" size={13} color={colors.success} />
                      : <Ionicons name="fitness-outline" size={13} color={colors.textMuted} />
                    }
                  </View>
                  <View style={styles.weekBody}>
                    <Text style={[styles.weekDay, pw.isCompleted && styles.weekDayDone]}>{pw.dayOfWeek}</Text>
                    <Text style={styles.weekName} numberOfLines={1}>{pw.name}</Text>
                    {pw.focus ? <Text style={styles.weekFocus} numberOfLines={1}>{pw.focus}</Text> : null}
                  </View>
                  {!pw.isCompleted && (
                    <TouchableOpacity
                      style={styles.weekPlayBtn}
                      onPress={() => handleStartProgramWorkout(pw)}
                      disabled={!!startingId}
                    >
                      {startingId === pw.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="play" size={14} color="#fff" />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Divider before standalone workouts */}
              {workouts.length > 0 && (
                <Text style={styles.standaloneDivider}>My Workout Templates</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !program ? (
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptyText}>Create your first workout or generate a program.</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/workouts/new')}>
                <Text style={styles.emptyCtaText}>Create Your First Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emptySecondary} onPress={() => router.push('/(app)/program')}>
                <Ionicons name="sparkles" size={15} color={colors.accent} />
                <Text style={styles.emptySecondaryText}>Generate a Program</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
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
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET, gap: spacing.sm },

  // Program section
  programSection: { gap: spacing.md, marginBottom: spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text, flex: 1 },
  seeAll: { fontSize: typography.sm, color: colors.accent, fontWeight: '600' },

  // Today card
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.accent + '70',
  },
  todayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.accentLight,
    borderRadius: radii.full,
  },
  todayBadgeText: { fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durText: { fontSize: typography.xs, color: colors.textSecondary },
  todayName: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  todayFocus: { fontSize: typography.sm, color: colors.accent },
  todayMeta: { fontSize: typography.xs, color: colors.textSecondary },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    marginTop: 4,
  },
  startBtnText: { fontSize: typography.md, fontWeight: '700', color: '#fff' },

  // Week rows
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekRowDone: { borderColor: colors.success + '30', opacity: 0.7 },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: { backgroundColor: colors.successLight ?? colors.border },
  weekBody: { flex: 1, gap: 2 },
  weekDay: { fontSize: typography.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  weekDayDone: { color: colors.success },
  weekName: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  weekFocus: { fontSize: typography.xs, color: colors.accent },
  weekPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  standaloneDivider: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  // Empty state
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl * 2 },
  emptyTitle: { fontSize: typography.xl, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },
  emptyCta: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  emptyCtaText: { fontSize: typography.md, fontWeight: '600', color: '#fff' },
  emptySecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  emptySecondaryText: { fontSize: typography.md, fontWeight: '600', color: colors.accent },
});
