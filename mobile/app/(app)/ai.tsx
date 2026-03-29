import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WorkoutPreview } from '@/components/ai/WorkoutPreview';
import { api } from '@/lib/api';
import { AiProgram, GenerateAiInput } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function AiScreen() {
  const [goal, setGoal] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | undefined>();
  const [equipment, setEquipment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [program, setProgram] = useState<AiProgram | null>(null);

  async function handleGenerate() {
    if (goal.trim().length < 10) {
      Toast.show({ type: 'error', text1: 'Goal must be at least 10 characters' });
      return;
    }
    setIsLoading(true);
    setProgram(null);
    try {
      const body: GenerateAiInput = {
        goal: goal.trim(),
        fitnessLevel: fitnessLevel || undefined,
        daysPerWeek,
        equipment: equipment.trim() || undefined,
      };
      const response = await api.post<{ program: AiProgram }>('/api/ai/generate', body);
      setProgram(response.program);
      Toast.show({ type: 'success', text1: 'Program generated and saved!' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Generation failed',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Workout Generator</Text>
        <Text style={styles.subtitle}>Describe your goal and get a custom program</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Input
              label="Your Goal *"
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Build muscle and increase strength over 8 weeks"
              multiline
              numberOfLines={3}
              testID="goal-input"
            />

            <Text style={styles.fieldLabel}>Fitness Level</Text>
            <View style={styles.chipRow}>
              {FITNESS_LEVELS.map((level) => (
                <Button
                  key={level}
                  onPress={() => setFitnessLevel(fitnessLevel === level ? '' : level)}
                  variant={fitnessLevel === level ? 'primary' : 'secondary'}
                  size="sm"
                  testID={`fitness-${level.toLowerCase()}`}
                >
                  {level}
                </Button>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Days Per Week</Text>
            <View style={styles.chipRow}>
              {DAYS_OPTIONS.map((d) => (
                <Button
                  key={d}
                  onPress={() => setDaysPerWeek(daysPerWeek === d ? undefined : d)}
                  variant={daysPerWeek === d ? 'primary' : 'secondary'}
                  size="sm"
                  testID={`days-${d}`}
                >
                  {d}
                </Button>
              ))}
            </View>

            <Input
              label="Equipment (optional)"
              value={equipment}
              onChangeText={setEquipment}
              placeholder="e.g. Barbell, dumbbells, pull-up bar"
              testID="equipment-input"
            />

            <Button
              onPress={handleGenerate}
              loading={isLoading}
              size="lg"
              style={styles.generateBtn}
              testID="generate-btn"
            >
              {isLoading ? 'Generating…' : 'Generate Program'}
            </Button>
          </Card>

          {program && (
            <View>
              <Text style={styles.resultTitle}>Your Program</Text>
              <WorkoutPreview program={program} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  fieldLabel: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  generateBtn: { marginTop: spacing.lg },
  resultTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
});
