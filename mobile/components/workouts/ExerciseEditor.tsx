import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExerciseInput, SetInput } from '@/types';
import { colors, spacing, typography, radii } from '@/lib/theme';

interface ExerciseEditorProps {
  exercise: ExerciseInput;
  index: number;
  onChange: (index: number, exercise: ExerciseInput) => void;
  onRemove: (index: number) => void;
}

export function ExerciseEditor({ exercise, index, onChange, onRemove }: ExerciseEditorProps) {
  function updateName(name: string) {
    onChange(index, { ...exercise, name });
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
      targetReps: undefined,
      targetWeight: undefined,
      unit: 'kg',
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
        <Input
          value={exercise.name}
          onChangeText={updateName}
          placeholder="Exercise name"
          style={styles.nameInput}
          testID={`exercise-${index}-name`}
        />
        <Pressable onPress={() => onRemove(index)} style={styles.removeBtn} testID={`exercise-${index}-remove`}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>

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
  nameInput: {
    flex: 1,
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
