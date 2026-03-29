import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SessionCard } from '@/components/history/SessionCard';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { WorkoutSession } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadSessions() {
    try {
      const res = await api.get<{ sessions: WorkoutSession[]; total: number }>(
        '/api/sessions?limit=50',
      );
      setSessions(res.sessions);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadSessions(); }, []);

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.count}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard session={item} testID={`session-card-${item.id}`} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions(); }} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>Complete a workout to see it here.</Text>
          </View>
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
  count: { fontSize: typography.sm, color: colors.textSecondary },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl * 2 },
  emptyTitle: { fontSize: typography.xl, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },
});
