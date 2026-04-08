import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExercisePickerModal, type PickedExercise } from './ExercisePickerModal';
import { ExerciseInput, SetInput } from '@/types';
import { colors, spacing, typography, radii } from '@/lib/theme';

interface ExerciseEditorProps {
  exercise: ExerciseInput;
  index: number;
  onChange: (index: number, exercise: ExerciseInput) => void;
  onRemove: (index: number) => void;
}

export function ExerciseEditor({ exercise, index, onChange, onRemove }: ExerciseEditorProps) {
  const [showPicker, setShowPicker] = useState(false);

  function updateName(name: string) {
    onChange(index, { ...exercise, name });
  }

  function handlePickedExercise(picked: PickedExercise) {
    // Build default sets from library defaults
    const defaultSets: SetInput[] = Array.from({ length: picked.defaultSets }, (_, i) => ({
      setNumber: i + 1,
      targetReps: picked.defaultReps,
      targetWeight: undefined,
      unit: 'lbs',
    }));
    onChange(index, {
      ...exercise,
      name: picked.name,
      sets: defaultSets.length > 0 ? defaultSets : exercise.sets,
    });
  }

  function updateSet(setIdx: number, field: keyof SetInput, value: string) {
    const sets = exercise.sets.map((s, i) => {
      if (i !== setIdx) return s;
      const numVal = value === '' ? undefined : Number(value);
      return { ...s, [field]: numVal };
    });
    onChange(index, { ...exercise, sets });
  }

  function addSet() {
    const newSet: SetInput = {
      setNumber: exercise.sets.length + 1,
      targetReps: exercise.sets[exercise.sets.length - 1]?.targetReps,
      targetWeight: exercise.sets[exercise.sets.length - 1]?.targetWeight,
      unit: 'lbs',
    };
    onChange(index, { ...exercise, sets: [...exercise.sets, newSet] });
  }

  function removeSet(setIdx: number) {
    const sets = exercise.sets
      .filter((_, i) => i !== setIdx)
      .map((s, i) => ({ ...s, setNumber: i + 1 }));
    onChange(index, { ...exercise, sets });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Name picker button */}
        <TouchableOpacity
          style={[styles.namePicker, exercise.name ? styles.namePickerFilled : styles.namePickerEmpty]}
          onPress={() => setShowPicker(true)}
          testID={`exercise-${index}-name`}
          activeOpacity={0.7}
        >
          <Ionicons name="barbell-outline" size={15} color={exercise.name ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
          <Text
            style={[styles.nameText, !exercise.name && styles.namePlaceholder]}
            numberOfLines={1}
          >
            {exercise.name || 'Choose or type an exercise…'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <Pressable onPress={() => onRemove(index)} style={styles.removeBtn} testID={`exercise-${index}-remove`}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>

      {/* Inline name override when exercise is selected */}
      {exercise.name ? (
        <TouchableOpacity style={styles.changeRow} onPress={() => setShowPicker(true)}>
          <Ionicons name="swap-horizontal-outline" size={12} color={colors.textMuted} />
          <Text style={styles.changeText}>Change exercise</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.setsHeader}>
        <Text style={styles.colLabel}>Set</Text>
        <Text style={[styles.colLabel, styles.colCenter]}>Reps</Text>
        <Text style={[styles.colLabel, styles.colCenter]}>Weight</Text>
        <View style={{ width: 24 }} />
      </View>

      {exercise.sets.map((set, setIdx) => (
        <View key={setIdx} style={styles.setRow}>
          <Text style={styles.setNum}>{set.setNumber}</Text>
          <Input
            value={set.targetReps?.toString() ?? ''}
            onChangeText={(v) => updateSet(setIdx, 'targetReps', v)}
            placeholder="—"
            keyboardType="numeric"
            style={styles.setInput}
            testID={`exercise-${index}-set-${setIdx}-reps`}
          />
          <Input
            value={set.targetWeight?.toString() ?? ''}
            onChangeText={(v) => updateSet(setIdx, 'targetWeight', v)}
            placeholder="—"
            keyboardType="decimal-pad"
            style={styles.setInput}
            testID={`exercise-${index}-set-${setIdx}-weight`}
          />
          <Pressable onPress={() => removeSet(setIdx)} testID={`exercise-${index}-set-${setIdx}-remove`}>
            <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <Button
        onPress={addSet}
        variant="ghost"
        size="sm"
        style={styles.addSetBtn}
        testID={`exercise-${index}-add-set`}
      >
        + Add Set
      </Button>

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
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  namePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  namePickerEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  namePickerFilled: {
    backgroundColor: colors.accent + '12',
    borderColor: colors.accent + '40',
  },
  nameText: {
    flex: 1,
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
  },
  namePlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  changeText: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    width: 44,
  },
  colCenter: {
    width: 72,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setNum: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    width: 44,
  },
  setInput: {
    width: 72,
    textAlign: 'center',
  },
  addSetBtn: {
    alignSelf: 'flex-start',
  },
});
