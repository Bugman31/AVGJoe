import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';
import { colors, spacing, typography, radii, TAB_BAR_BOTTOM_INSET } from '@/lib/theme';
import { Program } from '@/types';

const CATEGORY_OPTIONS = [
  { label: 'Strength', value: 'strength' },
  { label: 'Fat Loss', value: 'fat_loss' },
  { label: 'Hypertrophy', value: 'hypertrophy' },
  { label: 'Endurance', value: 'endurance' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Powerlifting', value: 'powerlifting' },
  { label: 'Athletic', value: 'athletic' },
  { label: 'General', value: 'general' },
];

const DIFFICULTY_OPTIONS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export default function ShareProgramScreen() {
  const router = useRouter();

  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('strength');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');

  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await api.get<{ program: Program | null }>('/api/programs/active');
        setActiveProgram(res.program);
      } catch {
        // No active program — continue
      } finally {
        setIsLoadingProgram(false);
      }
    }
    fetchActive();
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a program name' });
      return;
    }
    if (!activeProgram) {
      Toast.show({ type: 'error', text1: 'No active program found', text2: 'You need an active program to share.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/shared-programs', {
        name: name.trim(),
        description: description.trim() || null,
        category,
        difficulty,
        durationWeeks: durationWeeks ? parseInt(durationWeeks, 10) : activeProgram.totalWeeks,
        daysPerWeek: daysPerWeek ? parseInt(daysPerWeek, 10) : 3,
        workoutPlan: activeProgram.weeklyStructure,
        equipment: [],
        tags: [],
      });
      Toast.show({ type: 'success', text1: 'Program published!' });
      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to publish',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Share My Program</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Active program notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.noticeText}>
            Your current active program will be used as the workout plan
          </Text>
        </View>

        {isLoadingProgram ? (
          <ActivityIndicator color={colors.accent} />
        ) : activeProgram ? (
          <View style={styles.activeProgramCard}>
            <Text style={styles.activeProgramLabel}>Active Program</Text>
            <Text style={styles.activeProgramName}>{activeProgram.name}</Text>
          </View>
        ) : (
          <View style={styles.noProgramCard}>
            <Text style={styles.noProgramText}>No active program found. Start a program first.</Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Program Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. My 12-Week Strength Builder"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your program..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pillRow}>
            {CATEGORY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, category === opt.value && styles.pillActive]}
                onPress={() => setCategory(opt.value)}
              >
                <Text style={[styles.pillText, category === opt.value && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.field}>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.pillRow}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, difficulty === opt.value && styles.pillActive]}
                onPress={() => setDifficulty(opt.value)}
              >
                <Text style={[styles.pillText, difficulty === opt.value && styles.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Duration (weeks)</Text>
            <TextInput
              style={styles.input}
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              placeholder={activeProgram ? String(activeProgram.totalWeeks) : '12'}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Days per week</Text>
            <TextInput
              style={styles.input}
              value={daysPerWeek}
              onChangeText={setDaysPerWeek}
              placeholder="3"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Publish Program</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_BOTTOM_INSET },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  noticeText: { flex: 1, fontSize: typography.sm, color: colors.accent },
  activeProgramCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeProgramLabel: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  activeProgramName: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginTop: 4 },
  noProgramCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  noProgramText: { fontSize: typography.sm, color: colors.danger },
  field: { gap: spacing.xs },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.md,
    color: colors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.accent },
  row: { flexDirection: 'row', gap: spacing.md },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: typography.lg, fontWeight: '700', color: '#fff' },
});
