import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { theme } from '@/lib/theme';

export interface ChartPoint {
  date: string;
  maxWeight: number;
  isPR: boolean;
}

interface Props {
  data: ChartPoint[];
  width: number;
  height?: number;
  unit?: string;
}

const PADDING = { top: 16, bottom: 32, left: 44, right: 16 };

export function ExerciseLineChart({ data, width, height = 180, unit = 'kg' }: Props) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const weights = data.map((d) => d.maxWeight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const toX = (i: number) => PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (w: number) => PADDING.top + chartH - ((w - minW) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.maxWeight)}`).join(' ');

  // Y-axis labels: min, mid, max
  const yLabels = [minW, (minW + maxW) / 2, maxW].map((v) => Math.round(v));
  const yPositions = [toY(minW), toY((minW + maxW) / 2), toY(maxW)];

  // X-axis: show first + last date
  const xLabels = [
    { label: formatDate(data[0].date), x: toX(0) },
    data.length > 1 ? { label: formatDate(data[data.length - 1].date), x: toX(data.length - 1) } : null,
  ].filter(Boolean) as { label: string; x: number }[];

  return (
    <Svg width={width} height={height}>
      {/* Y-axis grid lines + labels */}
      {yLabels.map((val, i) => (
        <React.Fragment key={i}>
          <Line
            x1={PADDING.left}
            y1={yPositions[i]}
            x2={width - PADDING.right}
            y2={yPositions[i]}
            stroke={theme.colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <SvgText
            x={PADDING.left - 6}
            y={yPositions[i] + 4}
            fontSize={10}
            fill={theme.colors.textMuted}
            textAnchor="end"
          >
            {val}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {data.map((d, i) => (
        <Circle
          key={i}
          cx={toX(i)}
          cy={toY(d.maxWeight)}
          r={d.isPR ? 5 : 3}
          fill={d.isPR ? theme.colors.warning : theme.colors.primary}
          stroke={theme.colors.bg}
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <SvgText
          key={i}
          x={xl.x}
          y={height - 4}
          fontSize={10}
          fill={theme.colors.textMuted}
          textAnchor={i === 0 ? 'start' : 'end'}
        >
          {xl.label}
        </SvgText>
      ))}

      {/* Unit label */}
      <SvgText x={PADDING.left - 6} y={PADDING.top - 4} fontSize={9} fill={theme.colors.textMuted} textAnchor="end">
        {unit}
      </SvgText>
    </Svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: theme.colors.textMuted },
});
