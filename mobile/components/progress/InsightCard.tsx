import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import type { Insight } from '@/hooks/useInsights';

const TAG_COLORS: Record<NonNullable<Insight['tag']>, string> = {
  strength:    theme.colors.primary,
  volume:      '#22c55e',
  consistency: '#f59e0b',
  recovery:    '#ef4444',
  habit:       '#9B5CFF',
};

const TAG_LABELS: Record<NonNullable<Insight['tag']>, string> = {
  strength:    'Strength',
  volume:      'Volume',
  consistency: 'Consistency',
  recovery:    'Recovery',
  habit:       'Habit',
};

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const tagColor = insight.tag ? TAG_COLORS[insight.tag] : theme.colors.primary;

  return (
    <View style={[styles.card, { borderLeftColor: insight.iconColor }]}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: insight.iconColor + '33' }]}>
          <Ionicons name={insight.icon as any} size={18} color={insight.iconColor} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{insight.title}</Text>
        {insight.tag && (
          <View style={[styles.tag, { backgroundColor: tagColor + '22', borderColor: tagColor + '55' }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{TAG_LABELS[insight.tag]}</Text>
          </View>
        )}
      </View>
      <Text style={styles.body}>{insight.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
