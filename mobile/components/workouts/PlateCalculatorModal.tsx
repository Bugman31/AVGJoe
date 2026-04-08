import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '@/lib/theme';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  unit?: 'lbs' | 'kg';
}

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [20, 15, 10, 5, 2.5, 1.25];
const BAR_LBS = 45;
const BAR_KG = 20;

function calcPlates(totalWeight: number, unit: 'lbs' | 'kg'): { size: number; count: number }[] | null {
  const barWeight = unit === 'lbs' ? BAR_LBS : BAR_KG;
  const plates = unit === 'lbs' ? PLATES_LBS : PLATES_KG;

  if (totalWeight < barWeight) return null;

  let remaining = (totalWeight - barWeight) / 2;
  const result: { size: number; count: number }[] = [];

  for (const size of plates) {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      result.push({ size, count });
      remaining = Math.round((remaining - count * size) * 1000) / 1000;
    }
  }

  if (remaining > 0.01) return null; // not achievable with standard plates
  return result;
}

export function PlateCalculatorModal({ visible, onClose, unit = 'lbs' }: PlateCalculatorModalProps) {
  const [weightInput, setWeightInput] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'lbs' | 'kg'>(unit);

  const barWeight = selectedUnit === 'lbs' ? BAR_LBS : BAR_KG;
  const totalWeight = parseFloat(weightInput) || 0;
  const plates = useMemo(() => {
    if (!weightInput || totalWeight <= 0) return null;
    return calcPlates(totalWeight, selectedUnit);
  }, [weightInput, totalWeight, selectedUnit]);

  const tooLight = weightInput && totalWeight > 0 && totalWeight < barWeight;
  const notAchievable = weightInput && totalWeight > 0 && !tooLight && plates === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Plate Calculator</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Unit toggle */}
        <View style={styles.unitToggle}>
          {(['lbs', 'kg'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, selectedUnit === u && styles.unitBtnActive]}
              onPress={() => setSelectedUnit(u)}
            >
              <Text style={[styles.unitBtnText, selectedUnit === u && styles.unitBtnTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weight input */}
        <Text style={styles.label}>Target Weight ({selectedUnit})</Text>
        <TextInput
          style={styles.input}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder={`e.g. ${selectedUnit === 'lbs' ? '225' : '100'}`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
        />

        <Text style={styles.barNote}>
          Standard bar: {barWeight} {selectedUnit}
        </Text>

        {/* Results */}
        {tooLight && (
          <Text style={styles.warning}>Weight is less than bar weight ({barWeight} {selectedUnit})</Text>
        )}
        {notAchievable && (
          <Text style={styles.warning}>Cannot be achieved with standard plates. Try adjusting by 2.5 {selectedUnit}.</Text>
        )}
        {plates && plates.length > 0 && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>Plates per side:</Text>
            <View style={styles.platesGrid}>
              {plates.map(({ size, count }) => (
                <View key={size} style={styles.platePill}>
                  <Text style={styles.plateCount}>{count}×</Text>
                  <Text style={styles.plateSize}>{size}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.totalNote}>
              Total: {totalWeight} {selectedUnit} ({barWeight} bar + {(totalWeight - barWeight) / 2} {selectedUnit} each side)
            </Text>
          </View>
        )}
        {plates && plates.length === 0 && !tooLight && (
          <Text style={styles.barOnly}>Bar only ({barWeight} {selectedUnit})</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  unitToggle: { flexDirection: 'row', gap: spacing.sm },
  unitBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  unitBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
  unitBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  unitBtnTextActive: { color: colors.accent },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: '700',
  },
  barNote: { fontSize: typography.xs, color: colors.textMuted },
  warning: { fontSize: typography.sm, color: colors.warning, fontWeight: '500' },
  results: { gap: spacing.sm },
  resultsTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  platesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  platePill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    backgroundColor: colors.accent + '20',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  plateCount: { fontSize: typography.sm, color: colors.accent, fontWeight: '700' },
  plateSize: { fontSize: typography.md, color: colors.text, fontWeight: '700' },
  totalNote: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.xs },
  barOnly: { fontSize: typography.md, color: colors.textSecondary, fontStyle: 'italic' },
});
