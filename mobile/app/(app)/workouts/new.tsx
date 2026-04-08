import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExerciseEditor } from '@/components/workouts/ExerciseEditor';
import { api } from '@/lib/api';
import { ExerciseInput, CreateTemplateInput } from '@/types';
import { colors, spacing, typography } from '@/lib/theme';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([
    { name: '', orderIndex: 0, sets: [{ setNumber: 1 }] },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { name: '', orderIndex: prev.length, sets: [{ setNumber: 1, targetReps: undefined, targetWeight: undefined }] },
    ]);
  }

  function updateExercise(index: number, exercise: ExerciseInput) {
    setExercises((prev) => prev.map((e, i) => (i === index ? exercise : e)));
  }

  function removeExercise(index: number) {
    setExercises((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((e, i) => ({ ...e, orderIndex: i })),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Workout name is required' });
      return;
    }
    const validExercises = exercises.filter((e) => e.name.trim());
    if (validExercises.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one exercise' });
      return;
    }

    setIsLoading(true);
    try {
      const body: CreateTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        exercises: validExercises,
      };
      await api.post('/api/workouts', body);
      Toast.show({ type: 'success', text1: 'Workout created!' });
      router.replace('/workouts');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save',
        text2: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.text}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>New Workout</Text>
        <Button onPress={handleSave} loading={isLoading} size="sm" testID="save-btn">
          Save
        </Button>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Workout Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Upper Body Push"
            testID="workout-name-input"
          />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What's this workout for?"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.sectionTitle}>Exercises</Text>

          {exercises.map((ex, i) => (
            <ExerciseEditor
              key={i}
              exercise={ex}
              index={i}
              onChange={updateExercise}
              onRemove={removeExercise}
            />
          ))}

          <Button
            onPress={addExercise}
            variant="secondary"
            size="md"
            testID="add-exercise-btn"
          >
            + Add Exercise
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
});
