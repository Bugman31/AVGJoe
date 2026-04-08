import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { api } from '@/lib/api';
import type { WorkoutSession, WorkoutSummary } from '@/types';

const RATING_COLORS: Record<string, string> = {
  Excellent: '#22c55e',
  Good: '#6366f1',
  Acceptable: '#f59e0b',
  'Off Day': '#ef4444',
};

const FATIGUE_LABELS: Record<string, string> = {
  low: 'Low fatigue — recovered well',
  moderate: 'Moderate fatigue — normal response',
  high: 'High fatigue — prioritize recovery',
  very_high: 'Very high fatigue — rest is essential',
};

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ session: WorkoutSession }>(`/api/sessions/${id}`);
        setSession(res.session);
        if (res.session.aiSummary) {
          try {
            setSummary(JSON.parse(res.session.aiSummary));
          } catch {}
        }
      } catch {}
      finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Analyzing your workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ratingColor = summary ? RATING_COLORS[summary.sessionRating] ?? theme.colors.primary : theme.colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Workout Complete</Text>
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
        </View>

        {/* Rating banner */}
        {summary && (
          <View style={[styles.ratingBanner, { borderColor: ratingColor + '40', backgroundColor: ratingColor + '15' }]}>
            <Text style={[styles.ratingText, { color: ratingColor }]}>{summary.sessionRating}</Text>
          </View>
        )}

        {/* Scores */}
        {summary && (
          <View style={styles.scoresRow}>
            <ScoreBlock value={summary.completionScore} label="Completion" color={theme.colors.success} />
            <ScoreBlock value={summary.performanceScore} label="Performance" color={theme.colors.primary} />
          </View>
        )}

        {/* Summary text */}
        {summary?.summaryText && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{summary.summaryText}</Text>
          </View>
        )}

        {/* Highlights */}
        {summary?.highlights && summary.highlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {summary.highlights.map((h, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
                <Text style={styles.bulletText}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Struggles */}
        {summary?.struggles && summary.struggles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Things to Note</Text>
            {summary.struggles.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning} />
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Fatigue */}
        {summary?.fatigueReading && (
          <View style={styles.fatigueCard}>
            <Ionicons name="battery-half-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.fatigueText}>{FATIGUE_LABELS[summary.fatigueReading]}</Text>
          </View>
        )}

        {/* Next session cue */}
        {summary?.nextSessionCue && (
          <View style={styles.cueCard}>
            <Text style={styles.cueTitleText}>Next Time</Text>
            <Text style={styles.cueText}>{summary.nextSessionCue}</Text>
          </View>
        )}

        {/* Progression note */}
        {summary?.progressionRecommendation && (
          <View style={styles.progressionCard}>
            <Ionicons name="trending-up-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.progressionText}>{summary.progressionRecommendation}</Text>
          </View>
        )}

        {/* No AI summary fallback */}
        {!summary && session && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Great work completing your workout! Keep up the consistency.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(app)/home')}>
            <Ionicons name="home-outline" size={18} color={theme.colors.text} />
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.progressBtn} onPress={() => router.replace('/(app)/progress')}>
            <Ionicons name="trending-up-outline" size={18} color="#fff" />
            <Text style={styles.progressBtnText}>View Progress</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBlock({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[scoreStyles.block, { borderColor: color + '30' }]}>
      <View style={[scoreStyles.ring, { borderColor: color }]}>
        <Text style={[scoreStyles.value, { color }]}>{Math.round(value)}</Text>
      </View>
      <Text style={scoreStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  ratingBanner: { borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center' },
  ratingText: { fontSize: 20, fontWeight: '800' },
  scoresRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  summaryText: { fontSize: 15, color: theme.colors.text, lineHeight: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  fatigueCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  fatigueText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary },
  cueCard: { backgroundColor: theme.colors.primary + '15', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: theme.colors.primary + '30' },
  cueTitleText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  cueText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  progressionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  progressionText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  homeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border },
  homeBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  progressBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.primary },
  progressBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const scoreStyles = StyleSheet.create({
  block: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  ring: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
});
