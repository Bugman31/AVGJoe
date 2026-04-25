import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { SharedProgram } from '@/types';

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { program: activeProgram } = useActiveProgram();

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
        const data = await api.get<{ program: SharedProgram }>(`/api/shared-programs/${id}`);
        setProgram(data.program);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load program');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchProgram();
  }, [id]);

  async function doEnroll() {
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

  function handleEnroll() {
    if (!id) return;
    if (activeProgram) {
      Alert.alert(
        'Replace Current Program?',
        `You're enrolled in "${activeProgram.name}". Starting this program will archive it. Your workout history is preserved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: doEnroll },
        ]
      );
    } else {
      doEnroll();
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
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
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

  const stars = Math.round(program.ratingAverage ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Cover image with back button overlay */}
        <View style={styles.coverContainer}>
          {program.coverImageUrl ? (
            <Image source={{ uri: program.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <TouchableOpacity style={styles.backOverlay} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Program name */}
          <Text style={styles.title}>{program.name}</Text>

          {/* Creator row */}
          <View style={styles.creatorRow}>
            {program.creatorAvatar ? (
              <Image source={{ uri: program.creatorAvatar }} style={styles.creatorAvatar} />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Text style={styles.creatorAvatarInitial}>
                  {(program.creatorName ?? '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.creatorLabel}>Created by</Text>
              <Text style={styles.creatorName}>{program.creatorName}</Text>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{program.category}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{program.difficulty}</Text>
            </View>
          </View>

          {/* Price */}
          {(program.price ?? 0) === 0 ? (
            <View style={styles.priceRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              <Text style={styles.priceFree}>Free</Text>
            </View>
          ) : (
            <View style={styles.priceRow}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.priceBeta}>Free during beta</Text>
              <Text style={styles.priceFuture}>· ${program.price.toFixed(2)} when launched</Text>
            </View>
          )}

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
            {[1,2,3,4,5].map((star) => (
              <Ionicons
                key={star}
                name={star <= stars ? 'star' : 'star-outline'}
                size={18}
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

          {/* Rate */}
          <View style={styles.rateSection}>
            <Text style={styles.rateSectionTitle}>Rate This Program</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRate(star)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Ionicons
                    name={star <= userRating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= userRating ? colors.warning : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: typography.md, color: colors.danger, textAlign: 'center' },
  // Cover
  coverContainer: { position: 'relative' },
  coverImage: { width: '100%', height: 220 },
  coverPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // Body
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, lineHeight: 32 },
  // Creator
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  creatorAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
  creatorAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarInitial: { fontSize: 18, fontWeight: '700', color: '#fff' },
  creatorLabel: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  creatorName: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  // Badges
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
  // Stats
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
  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priceFree: { fontSize: typography.md, fontWeight: '700', color: colors.accent },
  priceBeta: { fontSize: typography.md, fontWeight: '700', color: colors.textSecondary },
  priceFuture: { fontSize: typography.sm, color: colors.textMuted },
  // Description
  description: { fontSize: typography.md, color: colors.textSecondary, lineHeight: 22 },
  // Enroll
  enrollBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { fontSize: typography.lg, fontWeight: '700', color: '#fff' },
  // Rate
  rateSection: { gap: spacing.sm },
  rateSectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
});
