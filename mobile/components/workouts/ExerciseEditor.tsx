import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExercisePickerModal, type PickedExercise } from './ExercisePickerModal';
import { ExerciseInput, SetInput } from '@/types';
import { colors, spacing, typography, radii } from '@/lib/theme';
import { exerciseLibrary } from '@/lib/exerciseLibrary';
import { useCustomExercises } from '@/hooks/useCustomExercises';

interface ExerciseEditorProps {
  exercise: ExerciseInput;
  index: number;
  onChange: (index: number, exercise: ExerciseInput) => void;
  onRemove: (index: number) => void;
}

function sanitizeNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ExerciseEditor({ exercise, index, onChange, onRemove }: ExerciseEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { customExercises } = useCustomExercises();

  const selectedExercise = useMemo(() => {
    const query = exercise.name.trim().toLowerCase();
    if (!query) return null;
    return [...exerciseLibrary, ...customExercises].find((item) => item.name.toLowerCase() === query) ?? null;
  }, [customExercises, exercise.name]);

  function setExercise(next: ExerciseInput) {
    onChange(index, next);
  }

  function applyUnit(unit: 'lbs' | 'kg') {
    setExercise({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, unit })),
    });
  }

  function handlePickedExercise(picked: PickedExercise) {
    const existingWeight = exercise.sets[0]?.targetWeight;
    const unit = (exercise.sets[0]?.unit as 'lbs' | 'kg' | undefined) ?? 'lbs';
    const defaultSets: SetInput[] = Array.from({ length: picked.defaultSets }, (_, i) => ({
      setNumber: i + 1,
      targetReps: picked.defaultReps,
      targetWeight: existingWeight,
      unit,
    }));

    setExercise({
      ...exercise,
      name: picked.name,
      sets: defaultSets.length > 0 ? defaultSets : exercise.sets,
    });
  }

  function updateNotes(notes: string) {
    setExercise({ ...exercise, notes });
  }

  function updateSet(setIdx: number, field: keyof SetInput, value: string) {
    setExercise({
      ...exercise,
      sets: exercise.sets.map((set, idx) =>
        idx === setIdx ? { ...set, [field]: sanitizeNumber(value) } : set
      ),
    });
  }

  function addSet() {
    const previous = exercise.sets[exercise.sets.length - 1];
    const unit = (previous?.unit as 'lbs' | 'kg' | undefined) ?? 'lbs';
    const newSet: SetInput = {
      setNumber: exercise.sets.length + 1,
      targetReps: previous?.targetReps,
      targetWeight: previous?.targetWeight,
      unit,
    };
    setExercise({ ...exercise, sets: [...exercise.sets, newSet] });
  }

  function removeSet(setIdx: number) {
    if (exercise.sets.length === 1) return;
    setExercise({
      ...exercise,
      sets: exercise.sets
        .filter((_, idx) => idx !== setIdx)
        .map((set, idx) => ({ ...set, setNumber: idx + 1 })),
    });
  }

  const activeUnit = (exercise.sets[0]?.unit as 'lbs' | 'kg' | undefined) ?? 'lbs';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.headingBlock}>
          <Text style={styles.heading}>Exercise {index + 1}</Text>
          <Text style={styles.subheading}>
            Pick from the movement library or add your own.
          </Text>
        </View>
        <Pressable
          onPress={() => onRemove(index)}
          style={styles.removeBtn}
          testID={`exercise-${index}-remove`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>

      <TouchableOpacity
        style={[styles.namePicker, exercise.name ? styles.namePickerFilled : styles.namePickerEmpty]}
        onPress={() => setShowPicker(true)}
        testID={`exercise-${index}-name`}
        activeOpacity={0.75}
      >
        <View style={styles.namePickerIcon}>
          <Ionicons
            name="barbell-outline"
            size={16}
            color={exercise.name ? colors.accent : colors.textMuted}
          />
        </View>
        <View style={styles.namePickerBody}>
          <Text style={styles.namePickerLabel}>Movement</Text>
          <Text style={[styles.nameText, !exercise.name && styles.namePlaceholder]} numberOfLines={1}>
            {exercise.name || 'Browse or search the exercise library'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {selectedExercise ? (
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{selectedExercise.category}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{selectedExercise.movementPattern}</Text>
          </View>
          <View style={styles.metaChipMuted}>
            <Text style={styles.metaChipMutedText}>
              {selectedExercise.defaultSets} x {selectedExercise.defaultReps} default
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.notesBox}>
        <Text style={styles.notesLabel}>Notes</Text>
        <TextInput
          value={exercise.notes ?? ''}
          onChangeText={updateNotes}
          placeholder="Optional cue, tempo, or setup detail"
          placeholderTextColor={colors.textMuted}
          style={styles.notesInput}
          multiline
        />
      </View>

      <View style={styles.toolsRow}>
        <Text style={styles.tableTitle}>Target Sets</Text>
        <View style={styles.unitSwitch}>
          {(['lbs', 'kg'] as const).map((unit) => {
            const active = activeUnit === unit;
            return (
              <TouchableOpacity
                key={unit}
                style={[styles.unitBtn, active && styles.unitBtnActive]}
                onPress={() => applyUnit(unit)}
              >
                <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>{unit}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.headerCellSet]}>Set</Text>
        <Text style={[styles.headerCell, styles.headerCellField]}>Reps</Text>
        <Text style={[styles.headerCell, styles.headerCellField]}>Weight</Text>
        <Text style={[styles.headerCell, styles.headerCellUnit]}>Unit</Text>
        <View style={styles.headerActionSpacer} />
      </View>

      <View style={styles.rows}>
        {exercise.sets.map((set, setIdx) => (
          <View key={setIdx} style={styles.setRow}>
            <View style={styles.setBadge}>
              <Text style={styles.setBadgeText}>{set.setNumber}</Text>
            </View>
            <TextInput
              value={set.targetReps?.toString() ?? ''}
              onChangeText={(value) => updateSet(setIdx, 'targetReps', value)}
              placeholder="8"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.compactInput, styles.inputCell]}
              testID={`exercise-${index}-set-${setIdx}-reps`}
            />
            <TextInput
              value={set.targetWeight?.toString() ?? ''}
              onChangeText={(value) => updateSet(setIdx, 'targetWeight', value)}
              placeholder="135"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.compactInput, styles.inputCell]}
              testID={`exercise-${index}-set-${setIdx}-weight`}
            />
            <View style={styles.unitPill}>
              <Text style={styles.unitPillText}>{(set.unit ?? activeUnit).toUpperCase()}</Text>
            </View>
            <Pressable
              onPress={() => removeSet(setIdx)}
              testID={`exercise-${index}-set-${setIdx}-remove`}
              style={styles.setRemoveBtn}
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={exercise.sets.length === 1 ? colors.border : colors.textMuted}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={addSet}
        style={styles.addSetBtn}
        testID={`exercise-${index}-add-set`}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
        <Text style={styles.addSetText}>Add another set</Text>
      </TouchableOpacity>

      <ExercisePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(picked) => {
          handlePickedExercise(picked);
          setShowPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headingBlock: {
    flex: 1,
    gap: 2,
  },
  heading: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  subheading: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  namePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  namePickerEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  namePickerFilled: {
    backgroundColor: colors.accent + '10',
    borderColor: colors.accent + '35',
  },
  namePickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  namePickerBody: {
    flex: 1,
    gap: 2,
  },
  namePickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nameText: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
  },
  namePlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.accentLight,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'capitalize',
  },
  metaChipMuted: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipMutedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notesBox: {
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notesInput: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tableTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.text,
  },
  unitSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  unitBtnActive: {
    backgroundColor: colors.accent,
  },
  unitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  unitBtnTextActive: {
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerCellSet: {
    width: 34,
  },
  headerCellField: {
    flex: 1,
    textAlign: 'center',
  },
  headerCellUnit: {
    width: 48,
    textAlign: 'center',
  },
  headerActionSpacer: {
    width: 28,
  },
  rows: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compactInput: {
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    textAlign: 'center',
  },
  inputCell: {
    flex: 1,
  },
  unitPill: {
    width: 48,
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  setRemoveBtn: {
    width: 28,
    alignItems: 'center',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent + '45',
    backgroundColor: colors.accent + '0f',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  addSetText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.accent,
  },
});
