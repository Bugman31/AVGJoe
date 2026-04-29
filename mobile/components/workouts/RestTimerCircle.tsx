import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';

interface RestTimerCircleProps {
  remaining: number;
  totalDuration: number;
  size?: number;
  strokeWidth?: number;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function clampProgress(remaining: number, totalDuration: number) {
  if (totalDuration <= 0) return 0;
  return Math.max(0, Math.min(remaining / totalDuration, 1));
}

export function RestTimerCircle({
  remaining,
  totalDuration,
  size = 196,
  strokeWidth = 8,
}: RestTimerCircleProps) {
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const progressAnim = useRef(
    new Animated.Value(circumference * (1 - clampProgress(remaining, totalDuration)))
  ).current;

  useEffect(() => {
    const progress = clampProgress(remaining, totalDuration);
    const offset = circumference * (1 - progress);

    Animated.timing(progressAnim, {
      toValue: offset,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [circumference, progressAnim, remaining, totalDuration]);

  const progress = clampProgress(remaining, totalDuration);
  const arcColor =
    progress > 0.5
      ? colors.success
      : progress > 0.25
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.circleWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progressAnim}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.countdownOverlay}>
        <Text style={[styles.countdownText, { fontSize: Math.round(size * 0.265) }]}>
          {formatTime(remaining)}
        </Text>
        <Text style={[styles.restingLabel, { fontSize: Math.max(11, Math.round(size * 0.066)) }]}>
          resting
        </Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  circleWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  restingLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
