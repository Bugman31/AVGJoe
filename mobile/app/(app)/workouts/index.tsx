import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { WorkoutCard } from '@/components/workouts/WorkoutCard';
import { Spinner } from '@/components/ui/Spinner';
import { useWorkouts } from '@/hooks/useWorkouts';
import { colors, spacing, typography } from '@/lib/theme';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { workouts, isLoading, refetch } = useWorkouts();
  const [refreshing, setRefreshing] = React.useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Create your first workout or use AI to generate one.</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/workouts/new')}>
              <Text style={styles.emptyCtaText}>Create Your First Workout</Text>
            </TouchableOpacity>
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
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
