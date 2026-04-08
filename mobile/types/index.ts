// ─── Auth / User ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  hasAnthropicKey?: boolean;
  hasOpenAiKey?: boolean;
  aiProvider?: 'anthropic' | 'openai';
  onboardingCompleted?: boolean;
  createdAt?: string;
}

// ─── User Profile (Onboarding) ─────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
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
  unitSystem: 'lbs' | 'kg';
  onboardingCompleted: boolean;
  aiCoachingSummary?: string;
  createdAt: string;
  updatedAt: string;
}

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
  unitSystem: 'lbs' | 'kg';
}

// ─── Program ───────────────────────────────────────────────────────────────

export interface PlannedExerciseSet {
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  rpeTarget?: string;
  unit: string;
}

export interface PlannedExercise {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: PlannedExerciseSet[];
}

export interface WarmupItem {
  name: string;
  duration: string;
}

export interface Conditioning {
  description: string;
  duration: string;
  intensity: string;
}

export interface PlannedWorkout {
  id: string;
  programId: string;
  weekNumber: number;
  dayOfWeek: string;
  scheduledDate?: string;
  name: string;
  focus?: string;
  warmup: WarmupItem[];
  exercises: PlannedExercise[];
  conditioning?: Conditioning;
  coachNotes?: string;
  estimatedDuration?: number;
  isCompleted: boolean;
  completedSessionId?: string;
  createdAt: string;
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  description?: string;
  totalWeeks: number;
  currentWeek: number;
  status: 'active' | 'completed' | 'archived';
  weeklyStructure: Record<string, unknown>;
  progressionRules: Record<string, unknown>;
  aiGoalSummary?: string;
  createdAt: string;
  updatedAt: string;
  plannedWorkouts: PlannedWorkout[];
}

// ─── Weekly Analysis ───────────────────────────────────────────────────────

export interface WeeklyAdjustment {
  exerciseName: string;
  adjustmentType: string;
  detail: string;
}

export interface WeeklyAnalysis {
  id: string;
  programId: string;
  weekNumber: number;
  adherenceScore: number;
  fatigueLevel: number;
  progressionNotes: string;
  adjustments: WeeklyAdjustment[];
  recommendations: string[];
  weekSummary: string;
  createdAt: string;
}

// ─── Workout Templates (legacy custom workouts) ────────────────────────────

export interface ExerciseSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  unit: string;
}

export interface Exercise {
  id: string;
  templateId: string;
  name: string;
  orderIndex: number;
  notes: string | null;
  sets: ExerciseSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  isAiGenerated: boolean;
  aiGoal: string | null;
  programId: string | null;
  weekNumber: number | null;
  dayOfWeek: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  exercises: Exercise[];
}

export interface AiProgram {
  programId: string;
  programName: string;
  programDescription: string;
  totalWeeks: number;
  templates: WorkoutTemplate[];
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
  rpe?: number | null;
  completedAt: string;
}

export interface WorkoutSummary {
  completionScore: number;
  performanceScore: number;
  sessionRating: 'Excellent' | 'Good' | 'Acceptable' | 'Off Day';
  highlights: string[];
  struggles: string[];
  fatigueReading: 'low' | 'moderate' | 'high' | 'very_high';
  progressionRecommendation: string;
  nextSessionCue: string;
  summaryText: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string | null;
  plannedWorkoutId?: string | null;
  programId?: string | null;
  name: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  preEnergyLevel?: number | null;
  postEnergyLevel?: number | null;
  sorenessLevel?: number | null;
  completionScore?: number | null;
  performanceScore?: number | null;
  aiSummary?: string | null;
  sets: SessionSet[];
}

export interface ProgressDataPoint {
  date: string;
  maxWeight: number;
  isPR: boolean;
  sessionId: string;
}

// ─── Exercise Library ──────────────────────────────────────────────────────

export interface LibraryExercise {
  name: string;
  category: 'strength' | 'cardio' | 'mobility';
  muscleGroups: string[];
  equipment: string[];
  movementPattern: string;
  defaultSets: number;
  defaultReps: number;
}

// ─── API response wrappers ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ─── Form input types ──────────────────────────────────────────────────────

export interface ExerciseInput {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: SetInput[];
}

export interface SetInput {
  setNumber: number;
  targetReps?: number;
  targetWeight?: number;
  unit?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  exercises: ExerciseInput[];
}

export interface LogSetInput {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualReps?: number;
  actualWeight?: number;
  unit?: string;
  rpe?: number;
}

export interface GenerateAiInput {
  goal: string;
  fitnessLevel?: string;
  daysPerWeek?: number;
  equipment?: string;
}
