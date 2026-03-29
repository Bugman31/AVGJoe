import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { api } from '@/lib/api';
import { ProgressDataPoint } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { colors, spacing, typography } from '@/lib/theme';

interface ProgressChartProps {
  exerciseId: string;
  exerciseName: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  if (data.length < 2) {
    return <Text style={styles.empty}>Not enough data to show progress chart.</Text>;
  }

  const chartData = data.map((point) => ({
    value: point.maxWeight,
    dataPointLabelComponent: point.isPR
      ? () => <Text style={styles.pr}>PR</Text>
      : undefined,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exerciseName} — Max Weight</Text>
      <LineChart
        data={chartData}
        width={SCREEN_WIDTH - spacing.lg * 4}
        height={180}
        color={colors.accent}
        thickness={2}
        dataPointsColor={colors.accent}
        dataPointsRadius={4}
        startFillColor={colors.accentLight}
        endFillColor="transparent"
        areaChart
        curved
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        backgroundColor={colors.surface}
        noOfSections={4}
        spacing={Math.max(24, (SCREEN_WIDTH - spacing.lg * 4 - 60) / data.length)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pr: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  error: {
    fontSize: typography.sm,
    color: colors.danger,
  },
  empty: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
