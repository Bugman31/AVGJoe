import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '@/lib/theme';

interface PastProgram {
  id: string;
  name: string;
  status: 'completed' | 'archived' | string;
  totalWeeks: number;
  currentWeek: number;
  createdAt: string;
  updatedAt: string;
  _count?: { plannedWorkouts: number; sessions: number };
}

interface Props {
  program: PastProgram;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

export function PastProgramCard({ program }: Props) {
  const router = useRouter();
  const weeksCompleted = Math.min(program.currentWeek, program.totalWeeks);
  const isComplete = program.status === 'completed';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/programs/${program.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.top}>
        <View style={[styles.statusBadge, isComplete ? styles.badgeComplete : styles.badgeArchived]}>
          <Text style={[styles.statusText, isComplete ? styles.statusTextComplete : styles.statusTextArchived]}>
            {isComplete ? 'COMPLETED' : 'ARCHIVED'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>

      <Text style={styles.name} numberOfLines={1}>{program.name}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {weeksCompleted}/{program.totalWeeks} weeks
          </Text>
        </View>
        {program._count?.sessions != null && program._count.sessions > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{program._count.sessions} sessions</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDateRange(program.createdAt, program.updatedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeComplete: { backgroundColor: colors.successLight },
  badgeArchived: { backgroundColor: colors.border },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextComplete: { color: colors.success },
  statusTextArchived: { color: colors.textMuted },
  name: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
});
