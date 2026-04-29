import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '@/lib/theme';
import { RestTimerCircle } from '@/components/workouts/RestTimerCircle';

interface RestTimerModalProps {
  visible: boolean;
  remaining: number;      // seconds left
  totalDuration: number;  // total seconds this rest was started at
  exerciseName: string;
  setInfo: string;        // e.g. "Set 3 of 4"
  aiTip: string;
  onAddTime: (seconds: number) => void;
  onClose: () => void;    // end rest early
}

export function RestTimerModal({
  visible,
  remaining,
  totalDuration,
  exerciseName,
  setInfo,
  aiTip,
  onAddTime,
  onClose,
}: RestTimerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
            <Text style={styles.setInfo}>{setInfo}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Circular timer */}
        <View style={styles.timerSection}>
          <RestTimerCircle remaining={remaining} totalDuration={totalDuration} />
        </View>

        {/* +/- time controls */}
        <View style={styles.timeControls}>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => onAddTime(-30)}
          >
            <Ionicons name="remove" size={20} color={colors.textSecondary} />
            <Text style={styles.timeBtnText}>−30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => onAddTime(30)}
          >
            <Ionicons name="add" size={20} color={colors.textSecondary} />
            <Text style={styles.timeBtnText}>+30s</Text>
          </TouchableOpacity>
        </View>

        {/* AI tip */}
        {aiTip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="sparkles" size={14} color={AI_PURPLE} />
            </View>
            <Text style={styles.tipText}>{aiTip}</Text>
          </View>
        ) : null}

        {/* End rest early */}
        <TouchableOpacity style={styles.endBtn} onPress={onClose}>
          <Text style={styles.endBtnText}>End rest early</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.text} />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const AI_PURPLE = '#9B5CFF';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  setInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  timeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: AI_PURPLE + '40',
    borderLeftWidth: 3,
    borderLeftColor: AI_PURPLE,
    padding: spacing.md,
  },
  tipIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AI_PURPLE + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  endBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
