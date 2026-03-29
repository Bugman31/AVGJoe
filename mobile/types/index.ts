export interface User {
  id: string;
  email: string;
  name: string | null;
  hasAnthropicKey?: boolean; // not always returned by all endpoints
  createdAt?: string;
}

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

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
  completedAt: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  sets: SessionSet[];
}

export interface ProgressDataPoint {
  date: string;
  maxWeight: number;
  isPR: boolean;
  sessionId: string;
}

// API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Form input types
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
}

export interface GenerateAiInput {
  goal: string;
  fitnessLevel?: string;
  daysPerWeek?: number;
  equipment?: string;
}
