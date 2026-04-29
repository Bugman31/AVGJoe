import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '@/lib/theme';
import type { SetRecommendation } from '@/types';

const AI_PURPLE = '#9B5CFF';

interface AICoachCardProps {
  feedback: string | null;       // null = loading
  recommendation: SetRecommendation;
  onMoreRest: () => void;
  onAdjustNext: (weight?: number, reps?: number) => void;
  onDismiss: () => void;
}

export function AICoachCard({
  feedback,
  recommendation,
  onMoreRest,
  onAdjustNext,
  onDismiss,
}: AICoachCardProps) {
  const [showReason, setShowReason] = useState(false);
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const canAdjust =
    recommendation.nextWeight != null || recommendation.nextReps != null;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={14} color={AI_PURPLE} />
        </View>
        <Text style={styles.label}>Coach</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Feedback text or skeleton */}
      {feedback == null ? (
        <View style={styles.skeletonWrap}>
          <View style={[styles.skeletonLine, { width: '90%' }]} />
          <View style={[styles.skeletonLine, { width: '65%', marginTop: 6 }]} />
        </View>
      ) : (
        <Text style={styles.feedbackText}>{feedback}</Text>
      )}

      {/* Expanded reason */}
      {showReason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>{recommendation.reason}</Text>
        </View>
      )}

      {/* Quick action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, showReason && styles.actionBtnActive]}
          onPress={() => setShowReason((v) => !v)}
        >
          <Text style={[styles.actionBtnText, showReason && styles.actionBtnTextActive]}>
            Why?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onMoreRest}>
          <Ionicons name="timer-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.actionBtnText}>+30s rest</Text>
        </TouchableOpacity>

        {canAdjust && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onAdjustNext(recommendation.nextWeight, recommendation.nextReps)}
          >
            <Ionicons name="arrow-forward-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Adjust next set</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: AI_PURPLE + '40',
    borderLeftWidth: 3,
    borderLeftColor: AI_PURPLE,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AI_PURPLE + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: AI_PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  feedbackText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  skeletonWrap: {
    gap: 0,
    paddingVertical: 2,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  reasonBox: {
    backgroundColor: AI_PURPLE + '12',
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionBtnActive: {
    borderColor: AI_PURPLE + '60',
    backgroundColor: AI_PURPLE + '12',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionBtnTextActive: {
    color: AI_PURPLE,
  },
});
