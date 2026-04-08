import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';
import { Skeleton } from './Skeleton';

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="60%" height={16} borderRadius={8} style={styles.row} />
      <Skeleton width="40%" height={14} borderRadius={8} style={styles.row} />
      <Skeleton width="100%" height={12} borderRadius={8} style={styles.metaRow} />
    </View>
  );
}

export function SkeletonList() {
  return (
    <View>
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  row: {
    marginBottom: 8,
  },
  metaRow: {
    marginTop: 4,
  },
});
