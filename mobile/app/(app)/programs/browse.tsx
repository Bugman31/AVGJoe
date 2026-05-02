import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSharedPrograms } from '@/hooks/useSharedPrograms';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { SharedProgram } from '@/types';
import {
  formatTag,
  getProgramBodyFocus,
  getProgramDurationMinutes,
  matchesBodyFocus,
  matchesDuration,
} from '@/lib/programCatalog';

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

const DURATIONS: { label: string; value: string }[] = [
  { label: 'All Lengths', value: '' },
  { label: '20 Min', value: '20_min' },
  { label: '30 Min', value: '30_min' },
  { label: '45 Min', value: '45_min' },
  { label: '60 Min', value: '60_min' },
];

const BODY_FOCUS: { label: string; value: string }[] = [
  { label: 'All Areas', value: '' },
  { label: 'Full Body', value: 'full_body' },
  { label: 'Upper Body', value: 'upper_body' },
  { label: 'Lower Body', value: 'lower_body' },
  { label: 'Back + Core', value: 'back_core' },
  { label: 'Glutes + Legs', value: 'glutes_legs' },
];

function FilterPills({
  items,
  activeValue,
  onPress,
}: {
  items: Array<{ label: string; value: string }>;
  activeValue: string;
  onPress: (item: { label: string; value: string }) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow} style={styles.pillScroll}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.value || item.label}
          style={[styles.pill, activeValue === item.value && styles.pillActive, index > 0 && styles.pillSpacing]}
          onPress={() => onPress(item)}
        >
          <Text style={[styles.pillText, activeValue === item.value && styles.pillTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function ProgramBrowseScreen() {
  const router = useRouter();
  const { programs, isLoading, error, search, setCategory, setDifficulty } = useSharedPrograms();

  const [activeCategory, setActiveCategory] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState('');
  const [activeDuration, setActiveDuration] = useState('');
  const [activeBodyFocus, setActiveBodyFocus] = useState('');

  const visiblePrograms = useMemo(
    () => programs.filter((program) => matchesDuration(program, activeDuration) && matchesBodyFocus(program, activeBodyFocus)),
    [programs, activeDuration, activeBodyFocus],
  );

  function handleCategoryPress(cat: { label: string; value: string }) {
    setActiveCategory(cat.value);
    setCategory(cat.value || null);
  }

  function handleDifficultyPress(diff: { label: string; value: string }) {
    setActiveDifficulty(diff.value);
    setDifficulty(diff.value || null);
  }

  function renderProgramCard({ item }: { item: SharedProgram }) {
    const isPaid = (item.price ?? 0) > 0;
    const stars = Math.round(item.ratingAverage ?? 0);
    const durationMinutes = getProgramDurationMinutes(item);
    const bodyFocus = getProgramBodyFocus(item);
    const quickTags = item.tags.filter((tag) => !/^\d+_min$/.test(tag) && !['beginner', 'intermediate', 'advanced'].includes(tag)).slice(0, 3);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/programs/${item.id}`)}
        activeOpacity={0.85}
      >
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.cardCover} resizeMode="cover" />
        ) : (
          <View style={styles.cardCoverPlaceholder}>
            <Ionicons name="barbell-outline" size={28} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
            <View style={[styles.priceBadge, isPaid && styles.priceBadgePaid]}>
              <Text style={[styles.priceBadgeText, isPaid && styles.priceBadgeTextPaid]}>
                {isPaid ? `$${item.price.toFixed(2)} · Soon` : 'Free'}
              </Text>
            </View>
          </View>

          <View style={styles.creatorRow}>
            {item.creatorAvatar ? (
              <Image source={{ uri: item.creatorAvatar }} style={styles.creatorAvatar} />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Text style={styles.creatorAvatarInitial}>{(item.creatorName ?? '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.creatorName}>{item.creatorName}</Text>
          </View>

          <View style={styles.highlightRow}>
            {durationMinutes ? (
              <View style={styles.microBadge}><Text style={styles.microBadgeText}>{durationMinutes} min</Text></View>
            ) : null}
            {bodyFocus ? (
              <View style={styles.microBadge}><Text style={styles.microBadgeText}>{bodyFocus}</Text></View>
            ) : null}
            <View style={styles.microBadge}><Text style={styles.microBadgeText}>{item.daysPerWeek} days/week</Text></View>
          </View>

          {quickTags.length > 0 ? (
            <View style={styles.tagRow}>
              {quickTags.map((tag) => (
                <Text key={`${item.id}-${tag}`} style={styles.tagText}>{formatTag(tag)}</Text>
              ))}
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.durationWeeks}wk · {item.category} · {item.difficulty}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={11}
                  color={s <= stars ? colors.warning : colors.textMuted}
                />
              ))}
              <Text style={styles.ratingText}>{(item.ratingAverage ?? 0).toFixed(1)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Programs</Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => router.push('/(app)/programs/share')}
        >
          <Text style={styles.shareBtnText}>Share My Program</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
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

      <FilterPills items={CATEGORIES} activeValue={activeCategory} onPress={handleCategoryPress} />
      <FilterPills items={DIFFICULTIES} activeValue={activeDifficulty} onPress={handleDifficultyPress} />
      <FilterPills items={DURATIONS} activeValue={activeDuration} onPress={(item) => setActiveDuration(item.value)} />
      <FilterPills items={BODY_FOCUS} activeValue={activeBodyFocus} onPress={(item) => setActiveBodyFocus(item.value)} />

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator testID="loading-indicator" size="large" color={colors.accent} />
        </View>
      )}
      {!isLoading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!isLoading && !error && (
        <FlatList
          data={visiblePrograms}
          keyExtractor={(item) => item.id}
          renderItem={renderProgramCard}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.md,
    color: colors.text,
  },
  pillScroll: { height: 44, flexGrow: 0, flexShrink: 0 },
  pillRow: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', height: 44 },
  pill: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSpacing: { marginLeft: spacing.sm },
  pillActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.accent },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { fontSize: typography.md, color: colors.danger, textAlign: 'center' },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardCover: { width: '100%', height: 140 },
  cardCoverPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.surfaceHover ?? colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: spacing.md, gap: spacing.xs },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardName: { fontSize: typography.lg, fontWeight: '700', color: colors.text, flex: 1 },
  priceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.accentLight },
  priceBadgeText: { fontSize: typography.xs, fontWeight: '700', color: colors.accent },
  priceBadgePaid: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  priceBadgeTextPaid: { color: colors.textMuted },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  creatorAvatar: { width: 22, height: 22, borderRadius: 11 },
  creatorAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarInitial: { fontSize: 10, fontWeight: '700', color: '#fff' },
  creatorName: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  microBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover ?? colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  microBadgeText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  tagText: { fontSize: typography.xs, color: colors.accent },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  metaText: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: typography.xs, color: colors.textMuted, marginLeft: 3 },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  emptyText: { fontSize: typography.lg, color: colors.textSecondary },
});
