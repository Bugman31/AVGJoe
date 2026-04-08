import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { theme } from '@/lib/theme';

interface DatePickerModalProps {
  visible: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  title?: string;
}

function buildDateOptions(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(now.getHours(), now.getMinutes(), 0, 0);
    dates.push(d);
  }
  return dates;
}

function formatLabel(date: Date, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DatePickerModal({ visible, onConfirm, onCancel, title = 'When did you work out?' }: DatePickerModalProps) {
  const dates = buildDateOptions();
  const [selected, setSelected] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Select the date for this workout</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dates.map((date, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.datePill, selected === i && styles.datePillActive]}
                onPress={() => setSelected(i)}
              >
                <Text style={[styles.datePillLabel, selected === i && styles.datePillLabelActive]}>
                  {formatLabel(date, i)}
                </Text>
                <Text style={[styles.datePillDate, selected === i && styles.datePillDateActive]}>
                  {i === 0 || i === 1
                    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : date.toLocaleDateString(undefined, { year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(dates[selected])}
            >
              <Text style={styles.confirmBtnText}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    paddingBottom: 36,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: -8 },
  dateRow: { gap: 10, paddingVertical: 4 },
  datePill: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    gap: 3,
  },
  datePillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  datePillLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  datePillLabelActive: { color: theme.colors.primary },
  datePillDate: { fontSize: 11, color: theme.colors.textMuted },
  datePillDateActive: { color: theme.colors.primary },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
