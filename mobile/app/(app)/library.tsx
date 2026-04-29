import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { exerciseLibrary, type LibraryExercise } from '@/lib/exerciseLibrary';
import { useCustomExercises } from '@/hooks/useCustomExercises';
import { Button } from '@/components/ui/Button';
import { ExerciseListItem } from '@/components/workouts/ExerciseListItem';

type Category = 'all' | 'strength' | 'cardio' | 'mobility';

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'All', value: 'all', icon: 'grid-outline' },
  { label: 'Strength', value: 'strength', icon: 'barbell-outline' },
  { label: 'Cardio', value: 'cardio', icon: 'heart-outline' },
  { label: 'Mobility', value: 'mobility', icon: 'leaf-outline' },
];

const MUSCLE_SUGGESTIONS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
  'hamstrings', 'glutes', 'core', 'calves', 'forearms', 'traps',
];

export default function LibraryScreen() {
  const router = useRouter();
  const { customExercises, addExercise, removeExercise } = useCustomExercises();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showCreate, setShowCreate] = useState(false);

  // Create exercise form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'strength' | 'cardio' | 'mobility'>('strength');
  const [newMuscles, setNewMuscles] = useState('');
  const [newSets, setNewSets] = useState('3');
  const [newReps, setNewReps] = useState('10');
  const [isSaving, setIsSaving] = useState(false);

  const allExercises = useMemo(
    () => [...exerciseLibrary, ...customExercises],
    [customExercises]
  );

  const filtered = useMemo(() => {
    let result = allExercises;
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
  }, [allExercises, selectedCategory, searchQuery]);

  function resetCreateForm() {
    setNewName('');
    setNewCategory('strength');
    setNewMuscles('');
    setNewSets('3');
    setNewReps('10');
  }

  async function handleCreateExercise() {
    const name = newName.trim();
    if (!name) {
      Toast.show({ type: 'error', text1: 'Exercise name is required' });
      return;
    }
    const isDuplicate = allExercises.some(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      Toast.show({ type: 'error', text1: 'An exercise with that name already exists' });
      return;
    }
    const muscles = newMuscles
      .split(',')
      .map((m) => m.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);

    setIsSaving(true);
    const exercise: LibraryExercise = {
      name,
      category: newCategory,
      muscleGroups: muscles.length > 0 ? muscles : ['full_body'],
      equipment: ['bodyweight'],
      movementPattern: newCategory === 'cardio' ? 'conditioning' : newCategory === 'mobility' ? 'mobility' : 'push',
      defaultSets: parseInt(newSets) || 3,
      defaultReps: parseInt(newReps) || 10,
    };
    await addExercise(exercise);
    setIsSaving(false);
    setShowCreate(false);
    resetCreateForm();
    Toast.show({ type: 'success', text1: `"${name}" added to your library` });
  }

  function confirmDelete(exercise: LibraryExercise) {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exercise.name}" from your custom exercises?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeExercise(exercise.name),
        },
      ]
    );
  }

  const isCustom = (name: string) => customExercises.some((e) => e.name === name);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{filtered.length}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add-circle" size={28} color={colors.accent} />
          </TouchableOpacity>
        </View>
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
              size={13}
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
        renderItem={({ item }) => (
          <ExerciseListItem
            exercise={item}
            isCustom={isCustom(item.name)}
            onPress={() => router.push(`/(app)/exercise/${encodeURIComponent(item.name)}`)}
            onDelete={isCustom(item.name) ? () => confirmDelete(item) : undefined}
            showMuscles
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exercises found</Text>
            <TouchableOpacity onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyAction}>Create a custom exercise</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Exercise Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowCreate(false); resetCreateForm(); }}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { setShowCreate(false); resetCreateForm(); }}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Create Exercise</Text>
            <TouchableOpacity
              onPress={() => { setShowCreate(false); resetCreateForm(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Exercise Name *</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Cable Lateral Raise"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.segmentRow}>
            {(['strength', 'cardio', 'mobility'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.segment, newCategory === cat && styles.segmentActive]}
                onPress={() => setNewCategory(cat)}
              >
                <Text style={[styles.segmentText, newCategory === cat && styles.segmentTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Muscle Groups (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={newMuscles}
            onChangeText={setNewMuscles}
            placeholder="e.g. shoulders, traps, core"
            placeholderTextColor={colors.textMuted}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MUSCLE_SUGGESTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.chip}
                onPress={() => {
                  const current = newMuscles.split(',').map((s) => s.trim()).filter(Boolean);
                  if (!current.includes(m)) {
                    setNewMuscles(current.length ? `${newMuscles}, ${m}` : m);
                  }
                }}
              >
                <Text style={styles.chipText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.setsRepsRow}>
            <View style={styles.setsRepsField}>
              <Text style={styles.label}>Default Sets</Text>
              <TextInput
                style={styles.input}
                value={newSets}
                onChangeText={setNewSets}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.setsRepsField}>
              <Text style={styles.label}>Default Reps</Text>
              <TextInput
                style={styles.input}
                value={newReps}
                onChangeText={setNewReps}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Button onPress={handleCreateExercise} loading={isSaving} size="lg">
            Save Exercise
          </Button>
        </View>
      </Modal>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { fontSize: typography.sm, color: colors.textSecondary },
  addBtn: { padding: 2 },
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  emptyAction: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  // Modal
  overlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: 48,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.md,
  },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  segmentActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  segmentText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: colors.accent },
  chipRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: typography.xs, color: colors.textSecondary },
  setsRepsRow: { flexDirection: 'row', gap: spacing.md },
  setsRepsField: { flex: 1, gap: spacing.xs },
});
