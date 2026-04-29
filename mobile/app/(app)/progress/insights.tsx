import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InsightCard } from '@/components/progress/InsightCard';
import { useInsights } from '@/hooks/useInsights';
import { theme, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';

export default function InsightsScreen() {
  const router = useRouter();
  const { insights, isLoading, refresh } = useInsights();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Insights</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh} disabled={isLoading}>
          <Ionicons
            name="refresh-outline"
            size={20}
            color={isLoading ? theme.colors.textMuted : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Patterns from your training history</Text>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Analyzing your workouts…</Text>
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bulb-outline" size={44} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Not enough data yet</Text>
            <Text style={styles.emptyBody}>
              Log at least a few workouts to unlock insights about your training patterns.
            </Text>
          </View>
        ) : (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 4 },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  refreshBtn: { padding: 4 },

  content: {
    padding: 16,
    paddingBottom: TAB_BAR_BOTTOM_INSET,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },

  loadingBox: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  emptyBox: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
