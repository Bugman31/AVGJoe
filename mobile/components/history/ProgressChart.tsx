import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '@/lib/api';
import { ProgressDataPoint } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { colors, spacing, typography } from '@/lib/theme';

interface ProgressChartProps {
  exerciseId: string;
  exerciseName: string;
}

export function ProgressChart({ exerciseId, exerciseName }: ProgressChartProps) {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ progress: ProgressDataPoint[] }>(`/api/sessions/progress/${exerciseId}`)
      .then((res) => setData(res.progress))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [exerciseId]);

  if (isLoading) return <Spinner size="small" />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (data.length < 2) return (
    <Text style={styles.empty}>Not enough data to show progress yet.</Text>
  );

  const maxWeight = Math.max(...data.map((d) => d.maxWeight));
  const BAR_HEIGHT = 120;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exerciseName} — Max Weight Progress</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          {/* Bars */}
          <View style={styles.barsRow}>
            {data.map((point, i) => {
              const heightPct = maxWeight > 0 ? point.maxWeight / maxWeight : 0;
              const barHeight = Math.max(4, heightPct * BAR_HEIGHT);
              return (
                <View key={i} style={styles.barWrapper}>
                  {point.isPR && <Text style={styles.prLabel}>PR</Text>}
                  <View style={[styles.barContainer, { height: BAR_HEIGHT }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: point.isPR ? colors.success : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{point.maxWeight}</Text>
                  <Text style={styles.barDate}>
                    {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendText}>Weight (kg)</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
        <Text style={styles.legendText}>Personal Record</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chart: { paddingVertical: spacing.sm },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  barWrapper: {
    alignItems: 'center',
    width: 44,
  },
  prLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  barContainer: {
    justifyContent: 'flex-end',
    width: 20,
  },
  bar: {
    width: 20,
    borderRadius: 3,
  },
  barValue: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 3,
  },
  barDate: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  error: { fontSize: typography.sm, color: colors.danger },
  empty: { fontSize: typography.sm, color: colors.textMuted, fontStyle: 'italic' },
});
