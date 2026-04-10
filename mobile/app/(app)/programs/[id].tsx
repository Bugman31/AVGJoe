import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { SharedProgram } from '@/types';

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [program, setProgram] = useState<SharedProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isRating, setIsRating] = useState(false);

  useEffect(() => {
    async function fetchProgram() {
      try {
        setIsLoading(true);
        const data = await api.get<SharedProgram>(`/api/shared-programs/${id}`);
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load program');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchProgram();
  }, [id]);

  async function handleEnroll() {
    if (!id) return;
    setIsEnrolling(true);
    try {
      await api.post(`/api/shared-programs/${id}/enroll`);
      Toast.show({ type: 'success', text1: 'Enrolled!', text2: 'Program added to your library.' });
      router.push('/(app)/program');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Enrollment failed',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleRate(rating: number) {
    if (!id || isRating) return;
    setUserRating(rating);
    setIsRating(true);
    try {
      await api.post(`/api/shared-programs/${id}/rate`, { rating, review: null });
      Toast.show({ type: 'success', text1: 'Rating submitted!' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Rating failed',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsRating(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !program) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Program not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Program name */}
        <Text style={styles.title}>{program.name}</Text>
        <Text style={styles.creator}>by {program.creatorName}</Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{program.category}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{program.difficulty}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{program.durationWeeks}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{program.daysPerWeek}</Text>
            <Text style={styles.statLabel}>Days/Week</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{program.enrollmentCount ?? 0}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
        </View>

        {/* Rating display */}
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(program.ratingAverage ?? 0) ? 'star' : 'star-outline'}
              size={20}
              color={colors.warning}
            />
          ))}
          <Text style={styles.ratingText}>{(program.ratingAverage ?? 0).toFixed(1)}</Text>
        </View>

        {/* Description */}
        {program.description ? (
          <Text style={styles.description}>{program.description}</Text>
        ) : null}

        {/* Enroll */}
        <TouchableOpacity
          style={[styles.enrollBtn, isEnrolling && styles.enrollBtnDisabled]}
          onPress={handleEnroll}
          disabled={isEnrolling}
        >
          {isEnrolling ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.enrollBtnText}>Start This Program</Text>
          )}
        </TouchableOpacity>

        {/* Rate this program */}
        <View style={styles.rateSection}>
          <Text style={styles.rateSectionTitle}>Rate This Program</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                <Ionicons
                  name={star <= userRating ? 'star' : 'star-outline'}
                  size={28}
                  color={star <= userRating ? colors.warning : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backText: { fontSize: typography.md, color: colors.text },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: TAB_BAR_BOTTOM_INSET,
  },
  title: { fontSize: typography.xxxl, fontWeight: '700', color: colors.text },
  creator: { fontSize: typography.md, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accentLight,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeText: { fontSize: typography.xs, color: colors.accent, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingText: { fontSize: typography.md, color: colors.text, fontWeight: '600', marginLeft: spacing.xs },
  description: { fontSize: typography.md, color: colors.textSecondary, lineHeight: 22 },
  enrollBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { fontSize: typography.lg, fontWeight: '700', color: '#fff' },
  rateSection: { gap: spacing.sm },
  rateSectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  errorText: { fontSize: typography.md, color: colors.danger, textAlign: 'center' },
});
