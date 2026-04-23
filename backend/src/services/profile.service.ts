import { prisma } from '../utils/prisma';
import { createProgram, type CreateProgramData, type PlannedExercise } from './program.service';

export interface OnboardingData {
  primaryGoal: string;
  secondaryGoals: string[];
  experienceLevel: string;
  daysPerWeek: number;
  sessionDurationMins: number;
  preferredSplit: string;
  availableEquipment: string[];
  restrictions: string[];
  injuryFlags: string[];
  workoutEnvironment: string;
  priorityAreas: string[];
  programStyle: string;
  benchmarkSquat?: number;
  benchmarkDeadlift?: number;
  benchmarkBench?: number;
  benchmarkPress?: number;
  benchmarkPullups?: number;
  benchmarkMileTime?: string;
  bodyweight?: number;
  bodyFatPercent?: number;
  unitSystem: string;
}

export async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function saveOnboarding(userId: string, data: OnboardingData) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      primaryGoal: data.primaryGoal,
      secondaryGoals: JSON.stringify(data.secondaryGoals),
      experienceLevel: data.experienceLevel,
      daysPerWeek: data.daysPerWeek,
      sessionDurationMins: data.sessionDurationMins,
      preferredSplit: data.preferredSplit,
      availableEquipment: JSON.stringify(data.availableEquipment),
      restrictions: JSON.stringify(data.restrictions),
      injuryFlags: JSON.stringify(data.injuryFlags),
      workoutEnvironment: data.workoutEnvironment,
      priorityAreas: JSON.stringify(data.priorityAreas),
      programStyle: data.programStyle,
      benchmarkSquat: data.benchmarkSquat,
      benchmarkDeadlift: data.benchmarkDeadlift,
      benchmarkBench: data.benchmarkBench,
      benchmarkPress: data.benchmarkPress,
      benchmarkPullups: data.benchmarkPullups,
      benchmarkMileTime: data.benchmarkMileTime,
      bodyweight: data.bodyweight,
      bodyFatPercent: data.bodyFatPercent,
      unitSystem: data.unitSystem,
      onboardingCompleted: true,
    },
    update: {
      primaryGoal: data.primaryGoal,
      secondaryGoals: JSON.stringify(data.secondaryGoals),
      experienceLevel: data.experienceLevel,
      daysPerWeek: data.daysPerWeek,
      sessionDurationMins: data.sessionDurationMins,
      preferredSplit: data.preferredSplit,
      availableEquipment: JSON.stringify(data.availableEquipment),
      restrictions: JSON.stringify(data.restrictions),
      injuryFlags: JSON.stringify(data.injuryFlags),
      workoutEnvironment: data.workoutEnvironment,
      priorityAreas: JSON.stringify(data.priorityAreas),
      programStyle: data.programStyle,
      benchmarkSquat: data.benchmarkSquat,
      benchmarkDeadlift: data.benchmarkDeadlift,
      benchmarkBench: data.benchmarkBench,
      benchmarkPress: data.benchmarkPress,
      benchmarkPullups: data.benchmarkPullups,
      benchmarkMileTime: data.benchmarkMileTime,
      bodyweight: data.bodyweight,
      bodyFatPercent: data.bodyFatPercent,
      unitSystem: data.unitSystem,
      onboardingCompleted: true,
    },
  });
}

export async function updateProfile(userId: string, data: Partial<OnboardingData> & { aiCoachingSummary?: string }) {
  const updateData: Record<string, unknown> = {};

  if (data.primaryGoal !== undefined) updateData.primaryGoal = data.primaryGoal;
  if (data.secondaryGoals !== undefined) updateData.secondaryGoals = JSON.stringify(data.secondaryGoals);
  if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
  if (data.daysPerWeek !== undefined) updateData.daysPerWeek = data.daysPerWeek;
  if (data.sessionDurationMins !== undefined) updateData.sessionDurationMins = data.sessionDurationMins;
  if (data.preferredSplit !== undefined) updateData.preferredSplit = data.preferredSplit;
  if (data.availableEquipment !== undefined) updateData.availableEquipment = JSON.stringify(data.availableEquipment);
  if (data.restrictions !== undefined) updateData.restrictions = JSON.stringify(data.restrictions);
  if (data.injuryFlags !== undefined) updateData.injuryFlags = JSON.stringify(data.injuryFlags);
  if (data.workoutEnvironment !== undefined) updateData.workoutEnvironment = data.workoutEnvironment;
  if (data.priorityAreas !== undefined) updateData.priorityAreas = JSON.stringify(data.priorityAreas);
  if (data.programStyle !== undefined) updateData.programStyle = data.programStyle;
  if (data.benchmarkSquat !== undefined) updateData.benchmarkSquat = data.benchmarkSquat;
  if (data.benchmarkDeadlift !== undefined) updateData.benchmarkDeadlift = data.benchmarkDeadlift;
  if (data.benchmarkBench !== undefined) updateData.benchmarkBench = data.benchmarkBench;
  if (data.benchmarkPress !== undefined) updateData.benchmarkPress = data.benchmarkPress;
  if (data.benchmarkPullups !== undefined) updateData.benchmarkPullups = data.benchmarkPullups;
  if (data.benchmarkMileTime !== undefined) updateData.benchmarkMileTime = data.benchmarkMileTime;
  if (data.bodyweight !== undefined) updateData.bodyweight = data.bodyweight;
  if (data.bodyFatPercent !== undefined) updateData.bodyFatPercent = data.bodyFatPercent;
  if (data.unitSystem !== undefined) updateData.unitSystem = data.unitSystem;
  if (data.aiCoachingSummary !== undefined) updateData.aiCoachingSummary = data.aiCoachingSummary;

  return prisma.userProfile.update({ where: { userId }, data: updateData });
}

// ─── Preloaded program templates ────────────────────────────────────────────

type DaySchedule = { dayOfWeek: string; name: string; focus: string; exercises: PlannedExercise[]; estimatedDuration: number };

function sets(n: number, reps: number): PlannedExercise['sets'] {
  return Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, targetReps: reps, targetWeight: null, unit: 'lbs' }));
}

const PUSH_EXERCISES: PlannedExercise[] = [
  { name: 'Barbell Bench Press', orderIndex: 0, notes: 'Control the descent', sets: sets(4, 6) },
  { name: 'Overhead Press', orderIndex: 1, notes: 'Brace your core', sets: sets(3, 8) },
  { name: 'Incline Dumbbell Press', orderIndex: 2, notes: '30–45° incline', sets: sets(3, 10) },
  { name: 'Lateral Raises', orderIndex: 3, notes: 'Light weight, controlled tempo', sets: sets(3, 15) },
  { name: 'Tricep Pushdowns', orderIndex: 4, notes: 'Cable or band', sets: sets(3, 12) },
];
const PULL_EXERCISES: PlannedExercise[] = [
  { name: 'Pull-ups', orderIndex: 0, notes: 'Use bands for assistance if needed', sets: sets(4, 6) },
  { name: 'Barbell Row', orderIndex: 1, notes: 'Row to lower chest', sets: sets(3, 8) },
  { name: 'Seated Cable Row', orderIndex: 2, notes: 'Retract scapula at top', sets: sets(3, 10) },
  { name: 'Face Pulls', orderIndex: 3, notes: 'Pull to ears, cable at eye height', sets: sets(3, 15) },
  { name: 'Barbell Curls', orderIndex: 4, notes: 'Controlled negatives', sets: sets(3, 10) },
];
const LEG_EXERCISES: PlannedExercise[] = [
  { name: 'Barbell Back Squat', orderIndex: 0, notes: 'Depth to parallel or below', sets: sets(4, 5) },
  { name: 'Romanian Deadlift', orderIndex: 1, notes: 'Push hips back, soft knee bend', sets: sets(3, 8) },
  { name: 'Leg Press', orderIndex: 2, notes: 'Full range, feet shoulder width', sets: sets(3, 10) },
  { name: 'Walking Lunges', orderIndex: 3, notes: 'Bodyweight or dumbbells', sets: sets(3, 12) },
  { name: 'Calf Raises', orderIndex: 4, notes: 'Pause at top and bottom', sets: sets(3, 15) },
];
const FULL_BODY_A: PlannedExercise[] = [
  { name: 'Barbell Back Squat', orderIndex: 0, notes: 'Work up to a challenging set of 5', sets: sets(3, 5) },
  { name: 'Barbell Bench Press', orderIndex: 1, notes: '3 sets across at same weight', sets: sets(3, 5) },
  { name: 'Barbell Row', orderIndex: 2, notes: 'Overhand grip, pull to lower chest', sets: sets(3, 5) },
];
const FULL_BODY_B: PlannedExercise[] = [
  { name: 'Deadlift', orderIndex: 0, notes: 'One top set of 5. Push the floor away.', sets: sets(1, 5) },
  { name: 'Overhead Press', orderIndex: 1, notes: '3 sets across', sets: sets(3, 5) },
  { name: 'Pull-ups', orderIndex: 2, notes: 'As many reps as possible each set', sets: sets(3, 5) },
];

function buildSchedule(daysPerWeek: number): DaySchedule[] {
  if (daysPerWeek <= 3) {
    return [
      { dayOfWeek: 'Monday',    name: 'Full Body A', focus: 'Squat / Bench / Row',     exercises: FULL_BODY_A, estimatedDuration: 50 },
      { dayOfWeek: 'Wednesday', name: 'Full Body B', focus: 'Deadlift / Press / Pull',  exercises: FULL_BODY_B, estimatedDuration: 45 },
      { dayOfWeek: 'Friday',    name: 'Full Body A', focus: 'Squat / Bench / Row',     exercises: FULL_BODY_A, estimatedDuration: 50 },
    ].slice(0, daysPerWeek);
  }
  if (daysPerWeek === 4) {
    return [
      { dayOfWeek: 'Monday',   name: 'Upper A', focus: 'Push & Pull',  exercises: [...PUSH_EXERCISES.slice(0,3), ...PULL_EXERCISES.slice(0,2)], estimatedDuration: 60 },
      { dayOfWeek: 'Tuesday',  name: 'Lower A', focus: 'Squat Focus',  exercises: LEG_EXERCISES, estimatedDuration: 60 },
      { dayOfWeek: 'Thursday', name: 'Upper B', focus: 'Push & Pull',  exercises: [...PULL_EXERCISES.slice(0,3), ...PUSH_EXERCISES.slice(1,3)], estimatedDuration: 60 },
      { dayOfWeek: 'Friday',   name: 'Lower B', focus: 'Hinge Focus',  exercises: [...LEG_EXERCISES.slice(1), LEG_EXERCISES[0]], estimatedDuration: 60 },
    ];
  }
  // 5 days: PPL + extras
  return [
    { dayOfWeek: 'Monday',    name: 'Push',       focus: 'Chest, Shoulders, Triceps', exercises: PUSH_EXERCISES, estimatedDuration: 65 },
    { dayOfWeek: 'Tuesday',   name: 'Pull',       focus: 'Back, Biceps',              exercises: PULL_EXERCISES, estimatedDuration: 65 },
    { dayOfWeek: 'Wednesday', name: 'Legs',       focus: 'Quads, Hamstrings, Glutes', exercises: LEG_EXERCISES,  estimatedDuration: 65 },
    { dayOfWeek: 'Thursday',  name: 'Push B',     focus: 'Volume — Chest & Shoulders', exercises: PUSH_EXERCISES, estimatedDuration: 60 },
    { dayOfWeek: 'Friday',    name: 'Pull B',     focus: 'Volume — Back & Biceps',    exercises: PULL_EXERCISES, estimatedDuration: 60 },
  ];
}

function goalLabel(goal: string): string {
  const map: Record<string, string> = {
    muscle_gain: 'Muscle Building',
    strength: 'Strength',
    weight_loss: 'Fat Loss',
    general_fitness: 'General Fitness',
    endurance: 'Endurance',
    sport_performance: 'Athletic Performance',
  };
  return map[goal] ?? 'General Fitness';
}

function levelLabel(level: string): string {
  const map: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  return map[level] ?? 'Intermediate';
}

export async function assignPreloadedProgram(userId: string, data: OnboardingData) {
  const schedule = buildSchedule(data.daysPerWeek);
  const totalWeeks = 4;

  const workouts: CreateProgramData['workouts'] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    for (const day of schedule) {
      workouts.push({ weekNumber: week, dayOfWeek: day.dayOfWeek, name: day.name, focus: day.focus, exercises: day.exercises, estimatedDuration: day.estimatedDuration });
    }
  }

  const programData: CreateProgramData = {
    name: `${levelLabel(data.experienceLevel)} ${goalLabel(data.primaryGoal)} — ${data.daysPerWeek} Days/Week`,
    description: `A 4-week preloaded program matched to your profile. Once you connect AI you can generate a fully personalized program.`,
    totalWeeks,
    aiGoalSummary: `${data.daysPerWeek}-day ${data.preferredSplit.replace(/_/g, ' ')} program for ${goalLabel(data.primaryGoal).toLowerCase()}. Progressive overload — add weight each session when you hit the top of the rep range.`,
    workouts,
  };

  return createProgram(userId, programData);
}
