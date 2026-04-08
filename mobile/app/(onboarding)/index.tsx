import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { api } from '@/lib/api';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import { StepCard } from '@/components/onboarding/StepCard';
import { SingleSelect } from '@/components/onboarding/SingleSelect';
import { OptionPicker } from '@/components/onboarding/OptionPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Step option sets ────────────────────────────────────────────────────────

const PRIMARY_GOALS = [
  { value: 'build_muscle', label: 'Build Muscle', description: 'Hypertrophy-focused training' },
  { value: 'get_stronger', label: 'Get Stronger', description: 'Strength-focused progressive overload' },
  { value: 'lose_fat', label: 'Lose Fat', description: 'Fat loss with muscle retention' },
  { value: 'improve_conditioning', label: 'Improve Conditioning', description: 'Cardio, endurance, and work capacity' },
  { value: 'athletic_performance', label: 'Athletic Performance', description: 'Sport-specific strength and power' },
  { value: 'general_fitness', label: 'General Fitness', description: 'Overall health and movement quality' },
];

const SECONDARY_GOALS = [
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'get_stronger', label: 'Get Stronger' },
  { value: 'lose_fat', label: 'Lose Fat' },
  { value: 'improve_conditioning', label: 'Conditioning' },
  { value: 'improve_mobility', label: 'Mobility' },
  { value: 'core_strength', label: 'Core Strength' },
  { value: 'posture', label: 'Posture' },
  { value: 'injury_prevention', label: 'Injury Prevention' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: '0–1 year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', description: '1–3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', description: '3+ years of consistent, structured training' },
];

const SPLITS = [
  { value: 'full_body', label: 'Full Body', description: 'Hit everything each session' },
  { value: 'upper_lower', label: 'Upper / Lower', description: '2-day rotating split' },
  { value: 'push_pull_legs', label: 'Push / Pull / Legs', description: '3-day PPL rotation' },
  { value: 'body_part', label: 'Body Part Split', description: 'Traditional bro split' },
  { value: 'athlete', label: "Athlete / Coach's Choice", description: 'Let the AI decide based on your goals' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'squat_rack', label: 'Squat Rack' },
  { value: 'bench', label: 'Bench' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'cable_machine', label: 'Cable Machine' },
  { value: 'machines', label: 'Machines (Smith, Leg Press, etc.)' },
  { value: 'kettlebells', label: 'Kettlebells' },
  { value: 'pull_up_bar', label: 'Pull-Up Bar' },
  { value: 'resistance_bands', label: 'Resistance Bands' },
  { value: 'row_machine', label: 'Rowing Machine' },
  { value: 'air_bike', label: 'Air / Assault Bike' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'bodyweight', label: 'Bodyweight Only' },
];

const RESTRICTION_OPTIONS = [
  { value: 'no_deadlifts', label: 'No Deadlifts' },
  { value: 'no_squats', label: 'No Barbell Squats' },
  { value: 'no_overhead_press', label: 'No Overhead Press' },
  { value: 'no_running', label: 'No Running' },
  { value: 'no_jumping', label: 'No Jumping' },
  { value: 'no_pull_ups', label: 'No Pull-Ups' },
  { value: 'low_impact_only', label: 'Low Impact Only' },
];

const INJURY_FLAGS = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'knee', label: 'Knee' },
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hip', label: 'Hip' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'neck', label: 'Neck' },
];

const ENVIRONMENTS = [
  { value: 'commercial_gym', label: 'Commercial Gym', description: 'Full equipment access' },
  { value: 'home_gym', label: 'Home Gym', description: 'Personal setup at home' },
  { value: 'limited_equipment', label: 'Limited Equipment', description: 'Minimal setup' },
  { value: 'hotel_travel', label: 'Travel / Hotel Gym', description: 'Basic equipment only' },
];

const PRIORITY_AREAS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'core', label: 'Core' },
  { value: 'conditioning', label: 'Conditioning' },
];

const PROGRAM_STYLES = [
  { value: 'structured', label: 'Structured Program', description: 'Follow a set plan day by day' },
  { value: 'flexible', label: 'Flexible Structure', description: 'Guidelines with room to adjust' },
  { value: 'blend', label: 'Blend of Both', description: 'Mostly structured but adaptable' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const {
    data,
    currentStep,
    totalSteps,
    setField,
    nextStep,
    prevStep,
    savePartial,
    loadPartial,
    clearPartial,
  } = useOnboarding();

  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    loadPartial();
  }, []);

  // Auto-save on each step change
  useEffect(() => {
    savePartial();
  }, [currentStep]);

  const toggleMulti = (field: keyof typeof data, value: string) => {
    const current = (data[field] as string[]) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setField(field as 'secondaryGoals', next);
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 1: return !!data.primaryGoal;
      case 2: return true; // optional
      case 3: return !!data.experienceLevel;
      case 4: return data.daysPerWeek >= 1;
      case 5: return data.sessionDurationMins >= 20;
      case 6: return !!data.preferredSplit;
      case 7: return data.availableEquipment.length > 0;
      case 8: return true; // optional
      case 9: return true; // optional
      case 10: return true; // optional benchmarks
      case 11: return !!data.unitSystem;
      case 12: return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/api/profile/onboarding', data);
      await clearPartial();
      // Refresh user state to pick up onboardingCompleted: true
      await refreshUser();
      router.replace('/(app)/home');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepCard title="What's your primary goal?" subtitle="This shapes your entire program." currentStep={1} totalSteps={totalSteps}>
            <SingleSelect options={PRIMARY_GOALS} selected={data.primaryGoal} onSelect={(v) => setField('primaryGoal', v)} />
          </StepCard>
        );
      case 2:
        return (
          <StepCard title="Any secondary goals?" subtitle="Optional — select up to 3." currentStep={2} totalSteps={totalSteps}>
            <OptionPicker
              options={SECONDARY_GOALS.filter((o) => o.value !== data.primaryGoal)}
              selected={data.secondaryGoals}
              onToggle={(v) => toggleMulti('secondaryGoals', v)}
              maxSelections={3}
            />
          </StepCard>
        );
      case 3:
        return (
          <StepCard title="Training experience" subtitle="Be honest — this determines your programming intensity." currentStep={3} totalSteps={totalSteps}>
            <SingleSelect options={EXPERIENCE_LEVELS} selected={data.experienceLevel} onSelect={(v) => setField('experienceLevel', v)} />
          </StepCard>
        );
      case 4:
        return (
          <StepCard title="How many days per week?" subtitle="How many days can you realistically commit to training?" currentStep={4} totalSteps={totalSteps}>
            <View style={styles.dayGrid}>
              {[2, 3, 4, 5, 6].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setField('daysPerWeek', d)}
                  style={[styles.dayButton, data.daysPerWeek === d && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayButtonText, data.daysPerWeek === d && styles.dayButtonTextSelected]}>{d}</Text>
                  <Text style={[styles.dayButtonLabel, data.daysPerWeek === d && styles.dayButtonLabelSelected]}>days</Text>
                </TouchableOpacity>
              ))}
            </View>
          </StepCard>
        );
      case 5:
        return (
          <StepCard title="Session length" subtitle="How long do you have per workout?" currentStep={5} totalSteps={totalSteps}>
            <View style={styles.durationGrid}>
              {[30, 45, 60, 75, 90].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  onPress={() => setField('sessionDurationMins', mins)}
                  style={[styles.durationButton, data.sessionDurationMins === mins && styles.durationButtonSelected]}
                >
                  <Text style={[styles.durationText, data.sessionDurationMins === mins && styles.durationTextSelected]}>
                    {mins === 90 ? '90+' : `${mins}`}
                  </Text>
                  <Text style={[styles.durationLabel, data.sessionDurationMins === mins && styles.durationLabelSelected]}>min</Text>
                </TouchableOpacity>
              ))}
            </View>
          </StepCard>
        );
      case 6:
        return (
          <StepCard title="Preferred split" subtitle="How do you like to organize your training?" currentStep={6} totalSteps={totalSteps}>
            <SingleSelect options={SPLITS} selected={data.preferredSplit} onSelect={(v) => setField('preferredSplit', v)} />
          </StepCard>
        );
      case 7:
        return (
          <StepCard title="Available equipment" subtitle="Select everything you have access to." currentStep={7} totalSteps={totalSteps}>
            <OptionPicker
              options={EQUIPMENT_OPTIONS}
              selected={data.availableEquipment}
              onToggle={(v) => toggleMulti('availableEquipment', v)}
            />
          </StepCard>
        );
      case 8:
        return (
          <StepCard title="Movement restrictions" subtitle="Optional — anything you need to avoid?" currentStep={8} totalSteps={totalSteps}>
            <OptionPicker
              options={RESTRICTION_OPTIONS}
              selected={data.restrictions}
              onToggle={(v) => toggleMulti('restrictions', v)}
            />
          </StepCard>
        );
      case 9:
        return (
          <StepCard title="Injury or limitation flags" subtitle="Optional — select any current issues." currentStep={9} totalSteps={totalSteps}>
            <OptionPicker
              options={INJURY_FLAGS}
              selected={data.injuryFlags}
              onToggle={(v) => toggleMulti('injuryFlags', v)}
            />
          </StepCard>
        );
      case 10:
        return (
          <StepCard title="Strength benchmarks" subtitle="Optional — helps calibrate your program. Skip if you don't know." currentStep={10} totalSteps={totalSteps}>
            <View style={styles.benchmarkGrid}>
              {[
                { label: 'Squat', field: 'benchmarkSquat' },
                { label: 'Deadlift', field: 'benchmarkDeadlift' },
                { label: 'Bench Press', field: 'benchmarkBench' },
                { label: 'Overhead Press', field: 'benchmarkPress' },
              ].map((item) => (
                <View key={item.field} style={styles.benchmarkRow}>
                  <Text style={styles.benchmarkLabel}>{item.label}</Text>
                  <TextInput
                    style={styles.benchmarkInput}
                    placeholder={`lbs / kg`}
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={data[item.field as keyof typeof data]?.toString() ?? ''}
                    onChangeText={(t) => {
                      const n = parseFloat(t);
                      setField(item.field as 'benchmarkSquat', isNaN(n) ? undefined : n);
                    }}
                  />
                </View>
              ))}
              <View style={styles.benchmarkRow}>
                <Text style={styles.benchmarkLabel}>Pull-Up Max Reps</Text>
                <TextInput
                  style={styles.benchmarkInput}
                  placeholder="reps"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={data.benchmarkPullups?.toString() ?? ''}
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    setField('benchmarkPullups', isNaN(n) ? undefined : n);
                  }}
                />
              </View>
            </View>
          </StepCard>
        );
      case 11:
        return (
          <StepCard title="Weight units" currentStep={11} totalSteps={totalSteps}>
            <SingleSelect
              options={[
                { value: 'lbs', label: 'Pounds (lbs)', description: 'Imperial units' },
                { value: 'kg', label: 'Kilograms (kg)', description: 'Metric units' },
              ]}
              selected={data.unitSystem}
              onSelect={(v) => setField('unitSystem', v as 'lbs' | 'kg')}
            />
          </StepCard>
        );
      case 12:
        return (
          <StepCard title="Ready to build your program" subtitle="Review your setup and generate your personalized training program." currentStep={12} totalSteps={totalSteps}>
            <View style={styles.reviewCard}>
              <ReviewRow label="Primary Goal" value={PRIMARY_GOALS.find((g) => g.value === data.primaryGoal)?.label ?? '—'} />
              <ReviewRow label="Experience" value={EXPERIENCE_LEVELS.find((e) => e.value === data.experienceLevel)?.label ?? '—'} />
              <ReviewRow label="Days / Week" value={`${data.daysPerWeek} days`} />
              <ReviewRow label="Session Length" value={`${data.sessionDurationMins} min`} />
              <ReviewRow label="Split" value={SPLITS.find((s) => s.value === data.preferredSplit)?.label ?? '—'} />
              <ReviewRow label="Equipment" value={`${data.availableEquipment.length} items selected`} />
              <ReviewRow label="Units" value={data.unitSystem.toUpperCase()} />
            </View>
            <View style={styles.programStyleSection}>
              <Text style={styles.sectionTitle}>Program Style</Text>
              <SingleSelect options={PROGRAM_STYLES} selected={data.programStyle} onSelect={(v) => setField('programStyle', v)} />
            </View>
          </StepCard>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          {currentStep > 1 ? (
            <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={styles.headerTitle}>Average Joe's Workout Tracker</Text>
          <TouchableOpacity onPress={() => router.replace('/(app)/profile')} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Step content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep < totalSteps ? (
            <Button
              onPress={nextStep}
              disabled={!canAdvance()}
            >
              Continue
            </Button>
          ) : (
            <Button
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Build My Program
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  footer: { padding: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  // Day picker
  dayGrid: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 },
  dayButton: { width: 56, height: 72, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  dayButtonSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '20' },
  dayButtonText: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  dayButtonTextSelected: { color: theme.colors.primary },
  dayButtonLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  dayButtonLabelSelected: { color: theme.colors.primary },
  // Duration picker
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  durationButton: { flex: 1, minWidth: 72, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' },
  durationButtonSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '20' },
  durationText: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  durationTextSelected: { color: theme.colors.primary },
  durationLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  durationLabelSelected: { color: theme.colors.primary },
  // Benchmarks
  benchmarkGrid: { gap: 12 },
  benchmarkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  benchmarkLabel: { fontSize: 15, color: theme.colors.text, flex: 1 },
  benchmarkInput: {
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  // Review
  reviewCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, gap: 12, marginBottom: 24 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewLabel: { fontSize: 14, color: theme.colors.textSecondary },
  reviewValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  programStyleSection: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
});
