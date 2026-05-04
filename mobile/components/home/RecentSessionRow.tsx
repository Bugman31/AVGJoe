import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '@/lib/theme';
import type { RecentSessionSummary } from '@/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(vol: number): string {
  if (vol === 0) return '';
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k lbs`;
  return `${Math.round(vol)} lbs`;
}

const SCORE_COLOR: Record<string, string> = {
  Excellent: colors.success,
  Great: colors.accent,
  Solid: colors.accent,
  'Needs Work': colors.warning,
  'Recovery Day': colors.textMuted,
};

interface Props {
  session: RecentSessionSummary;
}

export function RecentSessionRow({ session }: Props) {
  const router = useRouter();
  const scoreColor = session.scoreLabel ? (SCORE_COLOR[session.scoreLabel] ?? colors.textMuted) : colors.textMuted;
  const volumeStr = formatVolume(session.totalVolume);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/(app)/history/${session.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{session.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{formatDate(session.completedAt)}</Text>
          {volumeStr ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.volume}>{volumeStr}</Text>
            </>
          ) : null}
          {session.setCount > 0 && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.sets}>{session.setCount} sets</Text>
            </>
          )}
        </View>
      </View>

      {session.scoreLabel && (
        <View style={[styles.scoreBadge, { borderColor: scoreColor + '50', backgroundColor: scoreColor + '15' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{session.scoreLabel}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  date: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  dot: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  volume: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  sets: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  scoreBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
