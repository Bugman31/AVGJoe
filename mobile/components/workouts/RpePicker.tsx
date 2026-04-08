import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

// RPE descriptions shown under each value
const RPE_LABELS: Record<number, string> = {
  6: 'Easy',
  7: 'Moderate',
  8: 'Hard',
  9: 'Very Hard',
  10: 'Max',
};

interface RpePickerProps {
  visible: boolean;
  value: number | null;
  onSelect: (rpe: number) => void;
  onClose: () => void;
}

export function RpePicker({ visible, value, onSelect, onClose }: RpePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Rate of Perceived Exertion</Text>
          <Text style={styles.subtitle}>How hard did that set feel?</Text>

          <View style={styles.grid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.cell, value === n && styles.cellActive]}
                onPress={() => { onSelect(n); onClose(); }}
                testID={`rpe-option-${n}`}
              >
                <Text style={[styles.cellNum, value === n && styles.cellNumActive]}>{n}</Text>
                {RPE_LABELS[n] ? (
                  <Text style={[styles.cellLabel, value === n && styles.cellLabelActive]}>
                    {RPE_LABELS[n]}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={() => { onSelect(0); onClose(); }}>
            <Text style={styles.clearBtnText}>Clear RPE</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: -8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  cellNum: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  cellNumActive: { color: theme.colors.primary },
  cellLabel: { fontSize: 8, color: theme.colors.textMuted, textAlign: 'center' },
  cellLabelActive: { color: theme.colors.primary },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearBtnText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
});
