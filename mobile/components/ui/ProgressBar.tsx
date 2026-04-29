import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from '@/lib/theme';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  style?: StyleProp<ViewStyle>;
}

function clampValue(value: number) {
  return Math.max(0, Math.min(value, 1));
}

export function ProgressBar({
  value,
  color = colors.accent,
  height = 6,
  label,
  showPercent = false,
  style,
}: ProgressBarProps) {
  const clampedValue = clampValue(value);
  const progress = useRef(new Animated.Value(clampedValue)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clampedValue,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedValue, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={style}>
      {label || showPercent ? (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          {showPercent ? (
            <Text style={styles.percent}>{Math.round(clampedValue * 100)}%</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.track, { height, borderRadius: Math.max(height / 2, radii.full) }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              backgroundColor: color,
              borderRadius: Math.max(height / 2, radii.full),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  track: {
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  fill: {
    height: '100%',
    minWidth: 0,
  },
});
