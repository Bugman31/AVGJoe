/**
 * ExercisePickerModal
 * A searchable bottom-sheet for choosing an exercise from the standard library
 * or entering a custom name.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/lib/theme';
import { exerciseLibrary, type LibraryExercise } from '@/lib/exerciseLibrary';
import { useCustomExercises } from '@/hooks/useCustomExercises';

export interface PickedExercise {
  name: string;
  defaultSets: number;
  defaultReps: number;
  isCustom: boolean;
}

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: PickedExercise) => void;
}

type Category = 'all' | 'strength' | 'cardio' | 'mobility';

const CATEGORIES: { label: string; value: Category }[] = [
  { label: 'All', value: 'all' },
  { label: 'Strength', value: 'strength' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Mobility', value: 'mobility' },
];

const CATEGORY_COLORS: Record<string, string> = {
  strength: colors.accent,
  cardio: '#ef4444',
  mobility: '#22c55e',
};

export function ExercisePickerModal({ visible, onClose, onSelect }: ExercisePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const searchRef = useRef<TextInput>(null);
  const { customExercises } = useCustomExercises();

  const allExercises = useMemo(
    () => [...exerciseLibrary, ...customExercises],
    [customExercises]
  );

  useEffect(() => {
    if (visible) {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    let result = allExercises;
    if (category !== 'all') result = result.filter((e) => e.category === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscleGroups.some((m) => m.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allExercises, category, searchQuery]);

  function handleSelect(ex: LibraryExercise) {
    onSelect({ name: ex.name, defaultSets: ex.defaultSets, defaultReps: ex.defaultReps, isCustom: false });
    reset();
    onClose();
  }

  function handleCustom() {
    if (!searchQuery.trim()) return;
    onSelect({ name: searchQuery.trim(), defaultSets: 3, defaultReps: 10, isCustom: true });
    reset();
    onClose();
  }

  function reset() {
    setSearchQuery('');
    setCategory('all');
  }

  const showCustomOption = searchQuery.trim().length > 0 &&
    !allExercises.some((e) => e.name.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { reset(); onClose(); }} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Add Exercise</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search or type a custom name…"
            placeholderTextColor={colors.textMuted}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Custom option — shown when query doesn't match any library entry */}
        {showCustomOption && (
          <TouchableOpacity style={styles.customRow} onPress={handleCustom}>
            <View style={styles.customIconWrap}>
              <Ionicons name="add" size={18} color={colors.accent} />
            </View>
            <View style={styles.customInfo}>
              <Text style={styles.customName}>{searchQuery.trim()}</Text>
              <Text style={styles.customHint}>Add as custom exercise</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.pill, category === cat.value && styles.pillActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[styles.pillText, category === cat.value && styles.pillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const accent = CATEGORY_COLORS[item.category] ?? colors.accent;
            const muscles = item.muscleGroups.slice(0, 2).map((m) => m.replace(/_/g, ' ')).join(', ');
            return (
              <TouchableOpacity style={styles.exerciseRow} onPress={() => handleSelect(item)}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {muscles} · {item.defaultSets}×{item.defaultReps}
                  </Text>
                </View>
                <View style={[styles.catBadge, { backgroundColor: accent + '20' }]}>
                  <Text style={[styles.catBadgeText, { color: accent }]}>{item.category}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No exercises match your search.</Text>
              {searchQuery.trim() && (
                <Text style={styles.emptyHint}>Tap "Add as custom exercise" above to add it.</Text>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 15 },
  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    backgroundColor: colors.accent + '12',
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.accent + '30',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  customIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accent + '25', alignItems: 'center', justifyContent: 'center',
  },
  customInfo: { flex: 1 },
  customName: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  customHint: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  categoryRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.full, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 12,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: typography.md, fontWeight: '500', color: colors.text },
  exerciseMeta: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  catBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.sm, color: colors.textSecondary },
  emptyHint: { fontSize: typography.xs, color: colors.textMuted, textAlign: 'center' },
  listContent: { paddingBottom: 40 },
});
