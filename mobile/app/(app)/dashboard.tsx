import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { WorkoutSession, WorkoutTemplate } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

interface DashboardStats {
  totalSessions: number;
  thisWeekSessions: number;
  totalTemplates: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [sessRes, tmplRes] = await Promise.all([
        api.get<{ sessions: WorkoutSession[]; total: number }>('/api/sessions?limit=5'),
        api.get<{ templates: WorkoutTemplate[] }>('/api/workouts'),
      ]);
      setSessions(sessRes.sessions);
      setTemplates(tmplRes.templates);
    } catch {
      // Silently fail on dashboard — non-critical
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  const thisWeek = sessions.filter((s) => {
    const ms = Date.now() - new Date(s.startedAt).getTime();
    return ms < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const greeting = user?.name ? `Hey, ${user.name.split(' ')[0]}!` : 'Hey there!';

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subheading}>Ready to train?</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Sessions"
            value={sessions.length}
            icon="trophy-outline"
          />
          <StatCard
            label="This Week"
            value={thisWeek}
            icon="flame-outline"
          />
          <StatCard
            label="Templates"
            value={templates.length}
            icon="copy-outline"
          />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <Button
            onPress={() => router.push('/workouts')}
            variant="primary"
            size="lg"
            style={styles.actionBtn}
            testID="start-workout-btn"
          >
            Start Workout
          </Button>
          <Button
            onPress={() => router.push('/ai')}
            variant="secondary"
            size="lg"
            style={styles.actionBtn}
            testID="ai-generate-btn"
          >
            AI Generate
          </Button>
        </View>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              <Text
                style={styles.seeAll}
                onPress={() => router.push('/history')}
              >
                See all
              </Text>
            </View>
            {sessions.slice(0, 3).map((s) => (
              <RecentSessionRow key={s.id} session={s} />
            ))}
          </>
        )}

        {sessions.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No workouts yet.</Text>
            <Text style={styles.emptySubtext}>Start your first session!</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={colors.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function RecentSessionRow({ session }: { session: WorkoutSession }) {
  const router = useRouter();
  return (
    <Card style={styles.recentRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.recentName}>{session.name}</Text>
        <Text style={styles.recentDate}>
          {new Date(session.startedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textSecondary}
        onPress={() => router.push(`/history/${session.id}`)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  greeting: { fontSize: typography.xxxl, fontWeight: '800', color: colors.text },
  subheading: { fontSize: typography.lg, color: colors.textSecondary, marginTop: -spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  statValue: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: typography.sm, color: colors.accent, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: typography.lg, fontWeight: '600', color: colors.textSecondary },
  emptySubtext: { fontSize: typography.sm, color: colors.textMuted },
  recentRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  recentName: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  recentDate: { fontSize: typography.sm, color: colors.textSecondary },
});
