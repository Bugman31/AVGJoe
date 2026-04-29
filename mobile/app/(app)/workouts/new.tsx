import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExerciseEditor } from '@/components/workouts/ExerciseEditor';
import { api } from '@/lib/api';
import { ExerciseInput, CreateTemplateInput } from '@/types';
import { colors, spacing, typography, radii } from '@/lib/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WorkoutEntry {
  id: string;
  day: string | null;
  name: string;
  exercises: ExerciseInput[];
  isExpanded: boolean;
}

function makeDefaultExercises(): ExerciseInput[] {
  return [{ name: '', orderIndex: 0, sets: [{ setNumber: 1 }] }];
}

function makeEntry(day: string | null): WorkoutEntry {
  return {
    id: `${day ?? 'noday'}-${Date.now()}`,
    day,
    name: '',
    exercises: makeDefaultExercises(),
    isExpanded: true,
  };
}

function deepCopyExercises(exercises: ExerciseInput[]): ExerciseInput[] {
  return exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
}

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<WorkoutEntry[]>([makeEntry(null)]);
  const [isLoading, setIsLoading] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);

  const selectedDays = new Set(entries.map((e) => e.day).filter(Boolean) as string[]);

  function toggleDay(day: string) {
    if (selectedDays.has(day)) {
      const entry = entries.find((e) => e.day === day)!;
      const hasContent = entry.name.trim() || entry.exercises.some((e) => e.name.trim());
      const remove = () => setEntries((prev) => prev.filter((e) => e.day !== day));
      if (hasContent) {
        Alert.alert('Remove Day?', `Remove the ${day} workout? This can't be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: remove },
        ]);
      } else {
        remove();
      }
    } else {
      setEntries((prev) => [...prev, makeEntry(day)]);
    }
  }

  function toggleExpand(id: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isExpanded: !e.isExpanded } : e)));
  }

  function updateEntryName(id: string, name: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  }

  function addExercise(entryId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          exercises: [
            ...e.exercises,
            { name: '', orderIndex: e.exercises.length, sets: [{ setNumber: 1 }] },
          ],
        };
      })
    );
  }

  function updateExercise(entryId: string, index: number, exercise: ExerciseInput) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        return { ...e, exercises: e.exercises.map((ex, i) => (i === index ? exercise : ex)) };
      })
    );
  }

  function removeExercise(entryId: string, index: number) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          exercises: e.exercises
            .filter((_, i) => i !== index)
            .map((ex, i) => ({ ...ex, orderIndex: i })),
        };
      })
    );
  }

  function removeEntry(id: string) {
    if (entries.length === 1) {
      setEntries([makeEntry(null)]);
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function copyToDay(targetDay: string) {
    const source = entries.find((e) => e.id === copySourceId);
    if (!source) return;

    const existing = entries.find((e) => e.day === targetDay);

    const doApply = () => {
      if (existing) {
        setEntries((prev) =>
          prev.map((e) =>
            e.day === targetDay
              ? { ...e, exercises: deepCopyExercises(source.exercises) }
              : e
          )
        );
      } else {
        setEntries((prev) => [
          ...prev,
          {
            id: `${targetDay}-${Date.now()}`,
            day: targetDay,
            name: source.name,
            exercises: deepCopyExercises(source.exercises),
            isExpanded: true,
          },
        ]);
      }
      setCopySourceId(null);
    };

    if (existing) {
      Alert.alert(
        'Overwrite Exercises?',
        `${targetDay} already has a workout. Replace its exercises?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: doApply },
        ]
      );
    } else {
      doApply();
    }
  }

  async function handleSave() {
    const toSave = entries.filter((e) => e.exercises.some((ex) => ex.name.trim()));

    if (toSave.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one exercise to save' });
      return;
    }

    const unnamed = toSave.find((e) => !e.name.trim() && !e.day);
    if (unnamed) {
      Toast.show({ type: 'error', text1: 'Workout name is required' });
      return;
    }

    setIsLoading(true);
    try {
      for (const entry of toSave) {
        const body: CreateTemplateInput = {
          name: entry.name.trim() || `${entry.day} Workout`,
          dayOfWeek: entry.day ?? undefined,
          exercises: entry.exercises.filter((ex) => ex.name.trim()),
        };
        await api.post('/api/workouts', body);
      }
      const count = toSave.length;
      Toast.show({
        type: 'success',
        text1: count === 1 ? 'Workout created!' : `${count} workouts created!`,
      });
      router.replace('/workouts');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copySource = entries.find((e) => e.id === copySourceId);
  const copyableDays = DAYS.filter((d) => d !== copySource?.day);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text style={styles.title}>New Workout</Text>
        <Button onPress={handleSave} loading={isLoading} size="sm" testID="save-btn">
          Save
        </Button>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
              <Text style={styles.heroBadgeText}>Custom Workout Builder</Text>
            </View>
            <Text style={styles.heroTitle}>Build workouts with the full movement library</Text>
            <Text style={styles.heroBody}>
              Search exercises, apply default sets, add coaching notes, and line up your targets cleanly before you save.
            </Text>
          </View>

          {/* Day picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Days</Text>
            <Text style={styles.sectionSubtitle}>
              Tap a day to create a scheduled slot, or add an unscheduled workout below.
            </Text>
            <View style={styles.dayRow}>
              {DAYS.map((day, i) => {
                const active = selectedDays.has(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {DAY_ABBREV[i]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Workout entry cards */}
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <TouchableOpacity
                style={styles.entryHeader}
                onPress={() => toggleExpand(entry.id)}
                activeOpacity={0.7}
              >
                <View style={styles.entryHeaderLeft}>
                  <Ionicons
                    name={entry.isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.entryDayLabel}>
                    {entry.day ?? 'Unscheduled workout'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeEntry(entry.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>

              {entry.isExpanded && (
                <View style={styles.entryBody}>
                  <Input
                    label="Workout Name"
                    value={entry.name}
                    onChangeText={(v) => updateEntryName(entry.id, v)}
                    placeholder={
                      entry.day ? `e.g. ${entry.day} Push Day` : 'e.g. Upper Body Push'
                    }
                  />

                  {entry.exercises.map((ex, i) => (
                    <ExerciseEditor
                      key={i}
                      exercise={ex}
                      index={i}
                      onChange={(idx, updated) => updateExercise(entry.id, idx, updated)}
                      onRemove={(idx) => removeExercise(entry.id, idx)}
                    />
                  ))}

                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      style={styles.addExBtn}
                      onPress={() => addExercise(entry.id)}
                    >
                      <Ionicons name="add-circle-outline" size={15} color={colors.accent} />
                      <Text style={styles.addExBtnText}>Add Exercise</Text>
                    </TouchableOpacity>

                    {entries.length > 1 && (
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => setCopySourceId(entry.id)}
                      >
                        <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.copyBtnText}>Copy to...</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Add unscheduled slot */}
          {!entries.some((e) => e.day === null) && (
            <TouchableOpacity
              style={styles.addSlotBtn}
              onPress={() =>
                setEntries((prev) => [...prev, makeEntry(null)])
              }
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.addSlotBtnText}>Add unscheduled workout</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Copy-to bottom sheet */}
      <Modal visible={!!copySourceId} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCopySourceId(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Copy exercises to…</Text>
            <Text style={styles.modalSubtitle}>
              Copies all exercises from{' '}
              <Text style={{ fontWeight: '700' }}>
                {copySource?.day ?? 'this workout'}
              </Text>{' '}
              — you can edit each day's workout independently after.
            </Text>
            <ScrollView style={styles.modalList} bounces={false}>
              {copyableDays.map((day) => {
                const hasEntry = entries.some((e) => e.day === day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={styles.modalOption}
                    onPress={() => copyToDay(day)}
                  >
                    <Text style={styles.modalOptionText}>{day}</Text>
                    {hasEntry ? (
                      <Text style={styles.modalOptionHint}>will overwrite</Text>
                    ) : null}
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setCopySourceId(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
  },
  heroBody: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Day picker
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  sectionSubtitle: { fontSize: typography.sm, color: colors.textSecondary },
  dayRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 44,
    alignItems: 'center',
  },
  dayChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  dayChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  dayChipTextActive: { color: colors.accent },

  // Entry card
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  entryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryDayLabel: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  entryBody: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addExBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.accent },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtnText: { fontSize: typography.sm, color: colors.textSecondary },

  // Add unscheduled slot
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
  },
  addSlotBtnText: { fontSize: typography.sm, color: colors.textSecondary },

  // Copy-to modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  modalSubtitle: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  modalList: { flexGrow: 0 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  modalOptionText: { flex: 1, fontSize: typography.md, fontWeight: '600', color: colors.text },
  modalOptionHint: { fontSize: typography.xs, color: colors.textMuted },
  modalCancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  modalCancelText: { fontSize: typography.md, fontWeight: '600', color: colors.textSecondary },
});
