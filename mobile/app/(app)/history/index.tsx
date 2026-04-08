import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SessionCard } from '@/components/history/SessionCard';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { WorkoutSession } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadSessions() {
    try {
      const res = await api.get<{ sessions: WorkoutSession[]; total: number }>(
        '/api/sessions?limit=100',
      );
      setSessions(res.sessions);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function deleteSession(id: string) {
    try {
      await api.delete(`/api/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      Toast.show({ type: 'success', text1: 'Session deleted' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete session' });
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  }

  useEffect(() => { loadSessions(); }, []);

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.count}>{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search sessions…"
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.sessionRow}>
            <View style={styles.sessionCardWrap}>
              <SessionCard session={item} testID={`session-card-${item.id}`} />
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => confirmDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSessions(); }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No sessions match your search' : 'No sessions yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search term.' : 'Complete a workout to see it here.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(app)/workouts')}>
                <Text style={styles.emptyCtaText}>Start a Workout</Text>
              </TouchableOpacity>
            )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionCardWrap: { flex: 1 },
  deleteBtn: { padding: 8 },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl * 2 },
  emptyTitle: { fontSize: typography.xl, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },
  emptyCta: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  emptyCtaText: { fontSize: typography.md, fontWeight: '600', color: '#fff' },
});
