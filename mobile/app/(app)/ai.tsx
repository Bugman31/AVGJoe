import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';
import { generateText, isAppleAIAvailable } from 'apple-ai';

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const SPLIT_OPTIONS = ['Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Bro Split', 'Custom'];
const UNIT_OPTIONS: Array<'lbs' | 'kg'> = ['lbs', 'kg'];

const SYSTEM_PROMPT = `You are an expert certified personal trainer. Generate a multi-week strength training program as a single JSON object. Return ONLY valid JSON with no markdown, no explanation, no code fences.

JSON schema:
{
  "name": string,
  "description": string,
  "totalWeeks": number (2–8),
  "weeks": [
    {
      "weekNumber": number,
      "workouts": [
        {
          "dayOfWeek": string (e.g. "Monday"),
          "name": string,
          "focus": string,
          "estimatedDuration": number (minutes),
          "exercises": [
            {
              "name": string,
              "orderIndex": number (0-based),
              "notes": string,
              "sets": [
                { "setNumber": number, "targetReps": number | null, "targetWeight": number | null, "unit": string }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Progressive overload week over week (increase weight or reps each week)
- Each workout should have 4–7 exercises
- 3–5 sets per exercise
- Use evidence-based rep ranges (hypertrophy: 6–12, strength: 3–6)
- If benchmarks are provided, calculate working weights at ~70–80% of 1RM for main lifts
- Keep all weeks structurally identical in exercise selection; vary load/reps for progression`;

function buildUserPrompt(params: {
  goal: string;
  fitnessLevel: string;
  daysPerWeek?: number;
  equipment: string;
  preferredSplit: string;
  unitSystem: 'lbs' | 'kg';
  benchmarkBench?: number;
  benchmarkSquat?: number;
  benchmarkDeadlift?: number;
  benchmarkPress?: number;
}): string {
  const lines = [`Goal: ${params.goal}`];
  if (params.fitnessLevel) lines.push(`Fitness level: ${params.fitnessLevel}`);
  if (params.daysPerWeek) lines.push(`Training days per week: ${params.daysPerWeek}`);
  if (params.equipment) lines.push(`Available equipment: ${params.equipment}`);
  if (params.preferredSplit) lines.push(`Preferred training split: ${params.preferredSplit}`);
  lines.push(`Weight unit: ${params.unitSystem}`);
  if (params.benchmarkBench) lines.push(`Bench press 1RM: ${params.benchmarkBench} ${params.unitSystem}`);
  if (params.benchmarkSquat) lines.push(`Squat 1RM: ${params.benchmarkSquat} ${params.unitSystem}`);
  if (params.benchmarkDeadlift) lines.push(`Deadlift 1RM: ${params.benchmarkDeadlift} ${params.unitSystem}`);
  if (params.benchmarkPress) lines.push(`Overhead press 1RM: ${params.benchmarkPress} ${params.unitSystem}`);
  return lines.join('\n');
}

export default function AiScreen() {
  const router = useRouter();
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [goal, setGoal] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | undefined>();
  const [equipment, setEquipment] = useState('');
  const [preferredSplit, setPreferredSplit] = useState('');
  const [unitSystem, setUnitSystem] = useState<'lbs' | 'kg'>('lbs');
  const [benchmarkBench, setBenchmarkBench] = useState('');
  const [benchmarkSquat, setBenchmarkSquat] = useState('');
  const [benchmarkDeadlift, setBenchmarkDeadlift] = useState('');
  const [benchmarkPress, setBenchmarkPress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    isAppleAIAvailable().then(setAiAvailable);
  }, []);

  async function handleGenerate() {
    if (goal.trim().length < 10) {
      Toast.show({ type: 'error', text1: 'Goal must be at least 10 characters' });
      return;
    }
    if (!aiAvailable) {
      Alert.alert(
        'Apple Intelligence Required',
        'This feature requires Apple Intelligence (iPhone 15 Pro or later with iOS 18.1+) and must be enabled in Settings → Apple Intelligence & Siri.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const userPrompt = buildUserPrompt({
        goal: goal.trim(),
        fitnessLevel,
        daysPerWeek,
        equipment: equipment.trim(),
        preferredSplit,
        unitSystem,
        benchmarkBench: benchmarkBench ? Number(benchmarkBench) : undefined,
        benchmarkSquat: benchmarkSquat ? Number(benchmarkSquat) : undefined,
        benchmarkDeadlift: benchmarkDeadlift ? Number(benchmarkDeadlift) : undefined,
        benchmarkPress: benchmarkPress ? Number(benchmarkPress) : undefined,
      });

      const raw = await generateText(SYSTEM_PROMPT, userPrompt);

      let programData: unknown;
      try {
        const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
        programData = JSON.parse(cleaned);
      } catch {
        throw new Error('The AI returned an invalid response. Please try again.');
      }

      await api.post('/api/programs/custom', programData);
      Toast.show({ type: 'success', text1: 'Program created!', text2: 'Find it in your Programs tab.' });
      router.push('/(app)/(tabs)/programs');
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
        <Text style={styles.subtitle}>
          {aiAvailable === false
            ? 'Requires Apple Intelligence (iPhone 15 Pro+ · iOS 18.1+)'
            : 'Describe your goal and get a custom program'}
        </Text>
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

            <Text style={styles.fieldLabel}>Training Split (optional)</Text>
            <View style={styles.chipRow}>
              {SPLIT_OPTIONS.map((split) => (
                <Button
                  key={split}
                  onPress={() => setPreferredSplit(preferredSplit === split ? '' : split)}
                  variant={preferredSplit === split ? 'primary' : 'secondary'}
                  size="sm"
                  testID={`split-${split.toLowerCase().replace(/\//g, '-')}`}
                >
                  {split}
                </Button>
              ))}
            </View>

            <Text style={styles.sectionHeader}>Strength Benchmarks (optional)</Text>
            <Text style={styles.sectionSubtext}>Enter your 1-rep max so the AI can recommend working weights</Text>

            <Text style={styles.fieldLabel}>Weight Unit</Text>
            <View style={styles.chipRow}>
              {UNIT_OPTIONS.map((u) => (
                <Button
                  key={u}
                  onPress={() => setUnitSystem(u)}
                  variant={unitSystem === u ? 'primary' : 'secondary'}
                  size="sm"
                  testID={`unit-${u}`}
                >
                  {u}
                </Button>
              ))}
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkField}>
                <Input
                  label={`Bench (${unitSystem})`}
                  value={benchmarkBench}
                  onChangeText={setBenchmarkBench}
                  placeholder="e.g. 185"
                  keyboardType="numeric"
                  testID="bench-input"
                />
              </View>
              <View style={styles.benchmarkField}>
                <Input
                  label={`Squat (${unitSystem})`}
                  value={benchmarkSquat}
                  onChangeText={setBenchmarkSquat}
                  placeholder="e.g. 225"
                  keyboardType="numeric"
                  testID="squat-input"
                />
              </View>
            </View>
            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkField}>
                <Input
                  label={`Deadlift (${unitSystem})`}
                  value={benchmarkDeadlift}
                  onChangeText={setBenchmarkDeadlift}
                  placeholder="e.g. 275"
                  keyboardType="numeric"
                  testID="deadlift-input"
                />
              </View>
              <View style={styles.benchmarkField}>
                <Input
                  label={`OHP (${unitSystem})`}
                  value={benchmarkPress}
                  onChangeText={setBenchmarkPress}
                  placeholder="e.g. 115"
                  keyboardType="numeric"
                  testID="press-input"
                />
              </View>
            </View>

            <Button
              onPress={handleGenerate}
              loading={isLoading}
              disabled={aiAvailable === false}
              size="lg"
              style={styles.generateBtn}
              testID="generate-btn"
            >
              {isLoading ? 'Generating…' : 'Generate Program'}
            </Button>
          </Card>
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
  sectionHeader: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  benchmarkRow: { flexDirection: 'row', gap: spacing.sm },
  benchmarkField: { flex: 1 },
});
