import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/lib/theme';

interface WorkoutSummaryBarProps {
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  elapsedDisplay: string;
  restTimerActive: boolean;
  restTimerRemaining: number;
  onRestTimerPress: () => void;
}

function formatVolume(totalVolume: number) {
  return totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}k`
    : totalVolume.toLocaleString();
}

export function WorkoutSummaryBar({
  totalVolume,
  completedSets,
  totalSets,
  elapsedDisplay,
  restTimerActive,
  restTimerRemaining,
  onRestTimerPress,
}: WorkoutSummaryBarProps) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{formatVolume(totalVolume)}</Text>
        <Text style={styles.summaryLabel}>vol</Text>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>
          {completedSets}
          <Text style={styles.summaryValueMuted}>/{totalSets}</Text>
        </Text>
        <Text style={styles.summaryLabel}>sets</Text>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{elapsedDisplay}</Text>
        <Text style={styles.summaryLabel}>time</Text>
      </View>

      <TouchableOpacity
        style={[styles.summaryTimerBtn, restTimerActive && styles.summaryTimerBtnActive]}
        onPress={onRestTimerPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="timer-outline"
          size={16}
          color={restTimerActive ? theme.colors.primary : theme.colors.textMuted}
        />
        {restTimerActive ? (
          <Text style={styles.summaryTimerText}>{restTimerRemaining}s</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryValueMuted: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textMuted,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
  },
  summaryTimerBtn: {
    width: 52,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  summaryTimerBtnActive: {
    borderColor: theme.colors.primary + '60',
    backgroundColor: theme.colors.primaryLight,
  },
  summaryTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
