import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { LibraryExercise } from '@/types';

type Category = 'all' | 'strength' | 'cardio' | 'mobility';

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Strength', value: 'strength', icon: 'barbell-outline' },
  { label: 'Cardio', value: 'cardio', icon: 'heart-outline' },
  { label: 'Mobility', value: 'mobility', icon: 'body-outline' },
];

const PATTERN_ICONS: Record<string, string> = {
  push: 'arrow-up-outline',
  pull: 'arrow-down-outline',
  squat: 'chevron-down-outline',
  hinge: 'sync-outline',
  carry: 'walk-outline',
  core: 'radio-button-on-outline',
  conditioning: 'flame-outline',
  mobility: 'body-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  strength: colors.accent,
  cardio: '#ef4444',
  mobility: '#22c55e',
};

export default function LibraryScreen() {
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  useEffect(() => {
    api.get<{ exercises: LibraryExercise[]; total: number }>('/api/exercises')
      .then((res) => setExercises(res.exercises))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = exercises;
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscleGroups.some((m) => m.toLowerCase().includes(q))
      );
    }
    return result;
  }, [exercises, selectedCategory, searchQuery]);

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
        <Text style={styles.count}>{filtered.length} exercises</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search exercises or muscles…"
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.categoryPill, selectedCategory === cat.value && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={selectedCategory === cat.value ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.categoryPillText, selectedCategory === cat.value && styles.categoryPillTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function ExerciseCard({ exercise }: { exercise: LibraryExercise }) {
  const accentColor = CATEGORY_COLORS[exercise.category] ?? colors.accent;
  const patternIcon = PATTERN_ICONS[exercise.movementPattern] ?? 'fitness-outline';
  const muscles = exercise.muscleGroups.slice(0, 3).map((m) => m.replace(/_/g, ' ')).join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
          <Text style={[styles.categoryBadgeText, { color: accentColor }]}>{exercise.category}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name={patternIcon as any} size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{exercise.movementPattern.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="body-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{muscles}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="list-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{exercise.defaultSets}×{exercise.defaultReps}</Text>
        </View>
      </View>
    </View>
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
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  categoryRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryPillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  categoryPillTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  exerciseName: { flex: 1, fontSize: typography.md, fontWeight: '600', color: colors.text },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radii.full, borderWidth: 1,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'capitalize' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
