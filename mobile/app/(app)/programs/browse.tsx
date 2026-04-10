import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedPrograms } from '@/hooks/useSharedPrograms';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { SharedProgram } from '@/types';

// Category pill definitions: label shown + API value sent
const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Strength', value: 'strength' },
  { label: 'Fat Loss', value: 'fat_loss' },
  { label: 'Hypertrophy', value: 'hypertrophy' },
  { label: 'Endurance', value: 'endurance' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Powerlifting', value: 'powerlifting' },
  { label: 'Athletic', value: 'athletic' },
  { label: 'General', value: 'general' },
];

const DIFFICULTIES: { label: string; value: string }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export default function ProgramBrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    programs,
    isLoading,
    error,
    search,
    setCategory,
    setDifficulty,
    setSortBy,
  } = useSharedPrograms();

  const [activeCategory, setActiveCategory] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState('');

  function handleCategoryPress(cat: { label: string; value: string }) {
    const newVal = cat.value || null;
    setActiveCategory(cat.value);
    setCategory(newVal);
  }

  function handleDifficultyPress(diff: { label: string; value: string }) {
    setActiveDifficulty(diff.value);
    setDifficulty(diff.value || null);
  }

  function renderProgramCard({ item }: { item: SharedProgram }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/programs/${item.id}`)}
        activeOpacity={0.8}
      >
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCreator}>{item.creatorName}</Text>
        <Text style={styles.cardMetaText}>{item.durationWeeks}wk · {item.daysPerWeek}d/wk</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Browse Programs</Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => router.push('/(app)/programs/share')}
        >
          <Text style={styles.shareBtnText}>Share My Program</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search programs…"
          placeholderTextColor={colors.textMuted}
          onChangeText={search}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {/* Category pills */}
      <View style={styles.pillSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value || 'all'}
              style={[styles.pill, activeCategory === cat.value && styles.pillActive]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={[styles.pillText, activeCategory === cat.value && styles.pillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Difficulty pills */}
      <View style={styles.pillSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {DIFFICULTIES.map((diff) => (
            <TouchableOpacity
              key={diff.value}
              style={[styles.pill, activeDifficulty === diff.value && styles.pillActive]}
              onPress={() => handleDifficultyPress(diff)}
            >
              <Text style={[styles.pillText, activeDifficulty === diff.value && styles.pillTextActive]}>
                {diff.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator testID="loading-indicator" size="large" color={colors.accent} />
        </View>
      )}

      {/* Error */}
      {!isLoading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Program list */}
      {!isLoading && !error && (
        <FlatList
          data={programs}
          keyExtractor={(item) => item.id}
          renderItem={renderProgramCard}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No programs found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  shareBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  shareBtnText: { fontSize: typography.sm, fontWeight: '600', color: '#fff' },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.md,
    color: colors.text,
  },
  pillSection: {
    paddingVertical: spacing.xs,
  },
  pillRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.accent },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { fontSize: typography.md, color: colors.danger, textAlign: 'center' },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardName: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardCreator: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: 4 },
  cardMetaText: { fontSize: typography.xs, color: colors.textMuted },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  emptyText: { fontSize: typography.lg, color: colors.textSecondary },
});
