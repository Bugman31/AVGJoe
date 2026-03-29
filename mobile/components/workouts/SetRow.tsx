import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/lib/theme';

interface SetRowProps {
  setNumber: number;
  targetReps?: number | null;
  targetWeight?: number | null;
  unit?: string;
  actualReps?: string;
  actualWeight?: string;
  onChangeReps?: (val: string) => void;
  onChangeWeight?: (val: string) => void;
  readonly?: boolean;
  testID?: string;
}

export function SetRow({
  setNumber,
  targetReps,
  targetWeight,
  unit = 'kg',
  actualReps = '',
  actualWeight = '',
  onChangeReps,
  onChangeWeight,
  readonly = false,
  testID,
}: SetRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.setNumber}>Set {setNumber}</Text>

      <View style={styles.targets}>
        {targetReps != null && (
          <Text style={styles.target}>{targetReps} reps</Text>
        )}
        {targetWeight != null && (
          <Text style={styles.target}>{targetWeight} {unit}</Text>
        )}
      </View>

      {!readonly && (
        <View style={styles.inputs}>
          <Input
            value={actualReps}
            onChangeText={onChangeReps}
            placeholder={targetReps?.toString() ?? 'Reps'}
            keyboardType="numeric"
            style={styles.input}
            testID={testID ? `${testID}-reps` : undefined}
          />
          <Input
            value={actualWeight}
            onChangeText={onChangeWeight}
            placeholder={targetWeight?.toString() ?? 'Weight'}
            keyboardType="decimal-pad"
            style={styles.input}
            testID={testID ? `${testID}-weight` : undefined}
          />
        </View>
      )}

      {readonly && (
        <View style={styles.inputs}>
          <Text style={styles.actual}>{actualReps || '—'}</Text>
          <Text style={styles.actual}>{actualWeight ? `${actualWeight} ${unit}` : '—'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  setNumber: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 44,
  },
  targets: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  target: {
    fontSize: typography.sm,
    color: colors.textMuted,
  },
  inputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    width: 72,
    textAlign: 'center',
  },
  actual: {
    fontSize: typography.sm,
    color: colors.text,
    width: 72,
    textAlign: 'center',
  },
});
