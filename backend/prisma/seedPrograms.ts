/**
 * Seed script: preload community programs
 * Run: npx tsx prisma/seedPrograms.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function j(v: unknown) { return JSON.stringify(v); }

// Build a simple weekly plan given a day-map repeated for N weeks with
// optional per-week weight overrides via a multiplier.
function buildPlan(
  weeks: number,
  dayMap: Record<string, { name: string; focus: string; exercises: any[] }>,
  weeklyWeightIncrease = 0,   // kg added to every exercise each week
): Record<string, any> {
  const plan: Record<string, any> = {};
  for (let w = 1; w <= weeks; w++) {
    plan[`week${w}`] = {};
    for (const [day, session] of Object.entries(dayMap)) {
      plan[`week${w}`][day] = {
        name: session.name,
        focus: session.focus,
        exercises: session.exercises.map((ex: any) => ({
          ...ex,
          weight: ex.weight != null
            ? Math.round((ex.weight + weeklyWeightIncrease * (w - 1)) * 2) / 2
            : undefined,
        })),
      };
    }
  }
  return plan;
}

// ─── program definitions ────────────────────────────────────────────────────

const PROGRAMS = [

  // ══════════════════════════════════
  //  STRENGTH
  // ══════════════════════════════════
  {
    name: 'StrongLifts 5×5',
    description:
      'The classic barbell strength program. Two alternating full-body workouts (A/B) done 3×/week. Add 2.5 kg to every lift each session — simple, proven, and brutally effective for building a strong foundation.',
    category: 'strength',
    difficulty: 'beginner',
    durationWeeks: 12,
    daysPerWeek: 3,
    equipment: ['barbell', 'squat rack', 'bench'],
    tags: ['5x5', 'barbell', 'beginner', 'compound', 'linear progression'],
    ratingAverage: 4.8,
    enrollmentCount: 3200,
    workoutPlan: buildPlan(12, {
      Monday: {
        name: 'Workout A',
        focus: 'Squat / Bench / Row',
        exercises: [
          { name: 'Barbell Squat', sets: 5, reps: '5', weight: 60, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Barbell Bench Press', sets: 5, reps: '5', weight: 50, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Barbell Row', sets: 5, reps: '5', weight: 40, unit: 'kg', notes: 'Add 2.5 kg each session' },
        ],
      },
      Wednesday: {
        name: 'Workout B',
        focus: 'Squat / OHP / Deadlift',
        exercises: [
          { name: 'Barbell Squat', sets: 5, reps: '5', weight: 62.5, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Overhead Press', sets: 5, reps: '5', weight: 35, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Deadlift', sets: 1, reps: '5', weight: 80, unit: 'kg', notes: 'Add 5 kg each session' },
        ],
      },
      Friday: {
        name: 'Workout A',
        focus: 'Squat / Bench / Row',
        exercises: [
          { name: 'Barbell Squat', sets: 5, reps: '5', weight: 65, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Barbell Bench Press', sets: 5, reps: '5', weight: 52.5, unit: 'kg', notes: 'Add 2.5 kg each session' },
          { name: 'Barbell Row', sets: 5, reps: '5', weight: 42.5, unit: 'kg', notes: 'Add 2.5 kg each session' },
        ],
      },
    }, 0),
  },

  {
    name: 'GZCLP Linear Progression',
    description:
      'A tiered barbell program built around compound lifts (T1) and secondary movements (T2), supplemented with isolation work (T3). More volume than 5×5 while keeping linear progression on the big lifts.',
    category: 'strength',
    difficulty: 'beginner',
    durationWeeks: 10,
    daysPerWeek: 4,
    equipment: ['barbell', 'squat rack', 'bench', 'cable machine'],
    tags: ['GZCL', 'linear', 'barbell', '4-day', 'compound'],
    ratingAverage: 4.7,
    enrollmentCount: 1800,
    workoutPlan: buildPlan(10, {
      Monday: {
        name: 'Day 1 — Squat Focus',
        focus: 'T1 Squat / T2 OHP / T3 Accessories',
        exercises: [
          { name: 'Barbell Squat (T1)', sets: 5, reps: '3', weight: 80, unit: 'kg', notes: 'Add 2.5 kg per session' },
          { name: 'Overhead Press (T2)', sets: 3, reps: '10', weight: 40, unit: 'kg', notes: 'Add 2.5 kg when all reps complete' },
          { name: 'Lat Pulldown (T3)', sets: 3, reps: '15', weight: 45, unit: 'kg', notes: '2 min rest' },
          { name: 'Cable Row (T3)', sets: 3, reps: '15', weight: 40, unit: 'kg', notes: '' },
        ],
      },
      Tuesday: {
        name: 'Day 2 — Bench Focus',
        focus: 'T1 Bench / T2 Deadlift / T3 Accessories',
        exercises: [
          { name: 'Barbell Bench Press (T1)', sets: 5, reps: '3', weight: 70, unit: 'kg', notes: 'Add 2.5 kg per session' },
          { name: 'Deadlift (T2)', sets: 3, reps: '10', weight: 90, unit: 'kg', notes: 'Add 5 kg when all reps complete' },
          { name: 'Dumbbell Incline Press (T3)', sets: 3, reps: '15', weight: 22, unit: 'kg', notes: '' },
          { name: 'Tricep Pushdown (T3)', sets: 3, reps: '15', weight: 20, unit: 'kg', notes: '' },
        ],
      },
      Thursday: {
        name: 'Day 3 — OHP Focus',
        focus: 'T1 OHP / T2 Squat / T3 Accessories',
        exercises: [
          { name: 'Overhead Press (T1)', sets: 5, reps: '3', weight: 45, unit: 'kg', notes: 'Add 2.5 kg per session' },
          { name: 'Barbell Squat (T2)', sets: 3, reps: '10', weight: 70, unit: 'kg', notes: 'Add 2.5 kg when all reps complete' },
          { name: 'Dumbbell Lateral Raise (T3)', sets: 3, reps: '15', weight: 10, unit: 'kg', notes: '' },
          { name: 'Face Pull (T3)', sets: 3, reps: '15', weight: 15, unit: 'kg', notes: '' },
        ],
      },
      Friday: {
        name: 'Day 4 — Deadlift Focus',
        focus: 'T1 Deadlift / T2 Bench / T3 Accessories',
        exercises: [
          { name: 'Deadlift (T1)', sets: 5, reps: '3', weight: 100, unit: 'kg', notes: 'Add 5 kg per session' },
          { name: 'Barbell Bench Press (T2)', sets: 3, reps: '10', weight: 60, unit: 'kg', notes: 'Add 2.5 kg when all reps complete' },
          { name: 'Barbell Row (T3)', sets: 3, reps: '15', weight: 40, unit: 'kg', notes: '' },
          { name: 'Bicep Curl (T3)', sets: 3, reps: '15', weight: 14, unit: 'kg', notes: '' },
        ],
      },
    }, 2.5),
  },

  // ══════════════════════════════════
  //  HYPERTROPHY
  // ══════════════════════════════════
  {
    name: 'PHUL — Power Hypertrophy Upper Lower',
    description:
      'Four days per week combining power (low rep) and hypertrophy (moderate rep) work. Upper/lower split ensures each muscle group gets hit twice weekly with different stimuli for maximum size and strength gains.',
    category: 'hypertrophy',
    difficulty: 'intermediate',
    durationWeeks: 12,
    daysPerWeek: 4,
    equipment: ['barbell', 'dumbbells', 'cable machine', 'pull-up bar'],
    tags: ['PHUL', 'upper lower', 'power', 'hypertrophy', '4-day'],
    ratingAverage: 4.7,
    enrollmentCount: 2400,
    workoutPlan: buildPlan(12, {
      Monday: {
        name: 'Upper Power',
        focus: 'Chest / Back / Shoulders — Heavy',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '3-5', weight: 85, unit: 'kg', notes: '3 min rest' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '6-10', weight: 28, unit: 'kg', notes: '' },
          { name: 'Bent Over Barbell Row', sets: 4, reps: '3-5', weight: 75, unit: 'kg', notes: '3 min rest' },
          { name: 'Lat Pulldown', sets: 3, reps: '6-10', weight: 60, unit: 'kg', notes: '' },
          { name: 'Overhead Press', sets: 3, reps: '5-8', weight: 55, unit: 'kg', notes: '' },
        ],
      },
      Tuesday: {
        name: 'Lower Power',
        focus: 'Quads / Hamstrings / Glutes — Heavy',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '3-5', weight: 100, unit: 'kg', notes: '3 min rest' },
          { name: 'Deadlift', sets: 4, reps: '3-5', weight: 120, unit: 'kg', notes: '3 min rest' },
          { name: 'Leg Press', sets: 3, reps: '10-15', weight: 150, unit: 'kg', notes: '' },
          { name: 'Leg Curl', sets: 3, reps: '10-15', weight: 40, unit: 'kg', notes: '' },
          { name: 'Calf Raise', sets: 4, reps: '10-15', weight: 60, unit: 'kg', notes: '' },
        ],
      },
      Thursday: {
        name: 'Upper Hypertrophy',
        focus: 'Chest / Back / Shoulders — Volume',
        exercises: [
          { name: 'Incline Barbell Press', sets: 4, reps: '8-12', weight: 65, unit: 'kg', notes: '90 sec rest' },
          { name: 'Flat Dumbbell Press', sets: 4, reps: '8-12', weight: 26, unit: 'kg', notes: '' },
          { name: 'Cable Fly', sets: 3, reps: '12-15', weight: 15, unit: 'kg', notes: '' },
          { name: 'Seated Cable Row', sets: 4, reps: '8-12', weight: 55, unit: 'kg', notes: '' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', weight: 10, unit: 'kg', notes: '' },
          { name: 'EZ Bar Curl', sets: 3, reps: '10-12', weight: 25, unit: 'kg', notes: '' },
          { name: 'Skull Crusher', sets: 3, reps: '10-12', weight: 25, unit: 'kg', notes: '' },
        ],
      },
      Friday: {
        name: 'Lower Hypertrophy',
        focus: 'Quads / Hamstrings / Glutes — Volume',
        exercises: [
          { name: 'Front Squat', sets: 4, reps: '8-12', weight: 70, unit: 'kg', notes: '90 sec rest' },
          { name: 'Hack Squat', sets: 4, reps: '10-15', weight: 80, unit: 'kg', notes: '' },
          { name: 'Romanian Deadlift', sets: 4, reps: '10-12', weight: 80, unit: 'kg', notes: '' },
          { name: 'Leg Extension', sets: 3, reps: '12-15', weight: 45, unit: 'kg', notes: '' },
          { name: 'Seated Leg Curl', sets: 3, reps: '12-15', weight: 35, unit: 'kg', notes: '' },
          { name: 'Standing Calf Raise', sets: 5, reps: '12-15', weight: 70, unit: 'kg', notes: '' },
        ],
      },
    }, 2),
  },

  {
    name: 'Reddit PPL — Push Pull Legs',
    description:
      'Six-day Push/Pull/Legs split covering every major muscle group twice per week. Combines heavy compound movements with targeted isolation work — the gold standard for intermediate hypertrophy.',
    category: 'hypertrophy',
    difficulty: 'intermediate',
    durationWeeks: 12,
    daysPerWeek: 6,
    equipment: ['barbell', 'dumbbells', 'cable machine', 'pull-up bar'],
    tags: ['PPL', 'push pull legs', '6-day', 'intermediate', 'volume'],
    ratingAverage: 4.6,
    enrollmentCount: 4100,
    workoutPlan: buildPlan(12, {
      Monday: {
        name: 'Push — Heavy',
        focus: 'Chest / Shoulders / Triceps',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '5', weight: 80, unit: 'kg', notes: 'Add 2.5 kg/week' },
          { name: 'Overhead Press', sets: 3, reps: '5', weight: 50, unit: 'kg', notes: 'Add 2.5 kg/week' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', weight: 24, unit: 'kg', notes: '' },
          { name: 'Cable Lateral Raise', sets: 3, reps: '15-20', weight: 8, unit: 'kg', notes: '' },
          { name: 'Tricep Rope Pushdown', sets: 3, reps: '10-15', weight: 18, unit: 'kg', notes: '' },
        ],
      },
      Tuesday: {
        name: 'Pull — Heavy',
        focus: 'Back / Biceps / Rear Delts',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '5', weight: 100, unit: 'kg', notes: 'Add 5 kg/week' },
          { name: 'Pull-Ups', sets: 3, reps: '5-10', weight: 0, unit: 'kg', notes: 'Add weight when 10 reps easy' },
          { name: 'Barbell Row', sets: 3, reps: '5', weight: 70, unit: 'kg', notes: 'Add 2.5 kg/week' },
          { name: 'Face Pull', sets: 3, reps: '15-20', weight: 15, unit: 'kg', notes: '' },
          { name: 'EZ Bar Curl', sets: 3, reps: '10-15', weight: 24, unit: 'kg', notes: '' },
        ],
      },
      Wednesday: {
        name: 'Legs — Heavy',
        focus: 'Quads / Hamstrings / Calves',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '5', weight: 90, unit: 'kg', notes: 'Add 2.5 kg/week' },
          { name: 'Romanian Deadlift', sets: 3, reps: '8-12', weight: 70, unit: 'kg', notes: '' },
          { name: 'Leg Press', sets: 3, reps: '10-15', weight: 140, unit: 'kg', notes: '' },
          { name: 'Leg Curl', sets: 3, reps: '10-15', weight: 40, unit: 'kg', notes: '' },
          { name: 'Calf Raise', sets: 5, reps: '8-12', weight: 60, unit: 'kg', notes: '' },
        ],
      },
      Thursday: {
        name: 'Push — Volume',
        focus: 'Chest / Shoulders / Triceps',
        exercises: [
          { name: 'Incline Barbell Press', sets: 4, reps: '8-12', weight: 65, unit: 'kg', notes: '' },
          { name: 'Flat Dumbbell Press', sets: 3, reps: '10-15', weight: 24, unit: 'kg', notes: '' },
          { name: 'Cable Fly', sets: 3, reps: '15-20', weight: 12, unit: 'kg', notes: '' },
          { name: 'Dumbbell Lateral Raise', sets: 4, reps: '15-20', weight: 10, unit: 'kg', notes: '' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '10-15', weight: 20, unit: 'kg', notes: '' },
        ],
      },
      Friday: {
        name: 'Pull — Volume',
        focus: 'Back / Biceps / Rear Delts',
        exercises: [
          { name: 'Seated Cable Row', sets: 4, reps: '10-15', weight: 55, unit: 'kg', notes: '' },
          { name: 'Lat Pulldown', sets: 4, reps: '10-15', weight: 60, unit: 'kg', notes: '' },
          { name: 'Chest-Supported Row', sets: 3, reps: '10-15', weight: 20, unit: 'kg', notes: '' },
          { name: 'Rear Delt Fly', sets: 3, reps: '15-20', weight: 10, unit: 'kg', notes: '' },
          { name: 'Hammer Curl', sets: 3, reps: '10-15', weight: 14, unit: 'kg', notes: '' },
        ],
      },
      Saturday: {
        name: 'Legs — Volume',
        focus: 'Quads / Hamstrings / Glutes',
        exercises: [
          { name: 'Front Squat', sets: 4, reps: '8-12', weight: 65, unit: 'kg', notes: '' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: '10-15', weight: 20, unit: 'kg', notes: 'per leg' },
          { name: 'Leg Extension', sets: 3, reps: '15-20', weight: 45, unit: 'kg', notes: '' },
          { name: 'Nordic Curl / Leg Curl', sets: 3, reps: '10-15', weight: 35, unit: 'kg', notes: '' },
          { name: 'Seated Calf Raise', sets: 5, reps: '10-15', weight: 50, unit: 'kg', notes: '' },
        ],
      },
    }, 1.5),
  },

  // ══════════════════════════════════
  //  FAT LOSS
  // ══════════════════════════════════
  {
    name: 'Fat Loss Circuit — 8 Week Shred',
    description:
      'High-intensity circuit training combining compound lifts with metabolic conditioning. Short rest periods keep your heart rate elevated to maximize calorie burn while preserving muscle mass.',
    category: 'fat_loss',
    difficulty: 'intermediate',
    durationWeeks: 8,
    daysPerWeek: 4,
    equipment: ['dumbbells', 'kettlebell', 'pull-up bar', 'bench'],
    tags: ['fat loss', 'circuit', 'HIIT', 'metabolic', 'conditioning'],
    ratingAverage: 4.5,
    enrollmentCount: 1600,
    workoutPlan: buildPlan(8, {
      Monday: {
        name: 'Upper Circuit',
        focus: 'Chest / Back / Shoulders + Cardio Finisher',
        exercises: [
          { name: 'Push-Ups', sets: 4, reps: '15', weight: 0, unit: 'kg', notes: '30 sec rest between circuits' },
          { name: 'Dumbbell Row', sets: 4, reps: '12', weight: 20, unit: 'kg', notes: 'per arm' },
          { name: 'Dumbbell Shoulder Press', sets: 4, reps: '12', weight: 16, unit: 'kg', notes: '' },
          { name: 'Dumbbell Bicep Curl', sets: 3, reps: '15', weight: 12, unit: 'kg', notes: '' },
          { name: 'Battle Rope / Jump Rope', sets: 4, reps: '30 sec', weight: 0, unit: 'kg', notes: 'Finisher' },
        ],
      },
      Tuesday: {
        name: 'Lower Circuit',
        focus: 'Legs / Glutes + Cardio Finisher',
        exercises: [
          { name: 'Goblet Squat', sets: 4, reps: '15', weight: 24, unit: 'kg', notes: '' },
          { name: 'Kettlebell Swing', sets: 4, reps: '20', weight: 20, unit: 'kg', notes: '' },
          { name: 'Reverse Lunge', sets: 3, reps: '12', weight: 16, unit: 'kg', notes: 'per leg' },
          { name: 'Glute Bridge', sets: 3, reps: '20', weight: 0, unit: 'kg', notes: '' },
          { name: 'Box Jump / Step-Up', sets: 4, reps: '10', weight: 0, unit: 'kg', notes: 'Finisher' },
        ],
      },
      Thursday: {
        name: 'Full Body HIIT',
        focus: 'Total Body + Metabolic Conditioning',
        exercises: [
          { name: 'Dumbbell Thruster', sets: 4, reps: '12', weight: 14, unit: 'kg', notes: '45 sec work / 15 sec rest' },
          { name: 'Renegade Row', sets: 4, reps: '8', weight: 14, unit: 'kg', notes: 'per arm' },
          { name: 'Sumo Deadlift', sets: 3, reps: '15', weight: 60, unit: 'kg', notes: '' },
          { name: 'Burpee', sets: 4, reps: '10', weight: 0, unit: 'kg', notes: '' },
          { name: 'Mountain Climbers', sets: 3, reps: '30 sec', weight: 0, unit: 'kg', notes: '' },
        ],
      },
      Saturday: {
        name: 'Cardio + Core',
        focus: 'Steady State + Core Strengthening',
        exercises: [
          { name: 'Treadmill / Outdoor Run', sets: 1, reps: '30 min', weight: 0, unit: 'kg', notes: 'Zone 2 — 65% max HR' },
          { name: 'Plank', sets: 4, reps: '45 sec', weight: 0, unit: 'kg', notes: '' },
          { name: 'Bicycle Crunch', sets: 3, reps: '20', weight: 0, unit: 'kg', notes: 'per side' },
          { name: 'Dead Bug', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: 'per side' },
          { name: 'Russian Twist', sets: 3, reps: '15', weight: 6, unit: 'kg', notes: 'per side' },
        ],
      },
    }, 0),
  },

  {
    name: 'Beginner Fat Loss Sprint',
    description:
      'A 6-week beginner-friendly program mixing simple strength moves with brisk walking or light cardio. Three days in the gym, two optional cardio days. No complex movements — just consistent work that burns fat and builds confidence.',
    category: 'fat_loss',
    difficulty: 'beginner',
    durationWeeks: 6,
    daysPerWeek: 3,
    equipment: ['dumbbells', 'bench', 'treadmill'],
    tags: ['fat loss', 'beginner', 'walking', 'simple', 'full body'],
    ratingAverage: 4.4,
    enrollmentCount: 2100,
    workoutPlan: buildPlan(6, {
      Monday: {
        name: 'Full Body A',
        focus: 'Strength + Cardio Warm-Up',
        exercises: [
          { name: 'Treadmill Walk (incline 5%)', sets: 1, reps: '10 min', weight: 0, unit: 'kg', notes: 'Warm-up' },
          { name: 'Dumbbell Squat', sets: 3, reps: '12', weight: 10, unit: 'kg', notes: '' },
          { name: 'Dumbbell Bench Press', sets: 3, reps: '12', weight: 12, unit: 'kg', notes: '' },
          { name: 'Dumbbell Row', sets: 3, reps: '12', weight: 12, unit: 'kg', notes: 'per arm' },
          { name: 'Plank', sets: 3, reps: '30 sec', weight: 0, unit: 'kg', notes: '' },
        ],
      },
      Wednesday: {
        name: 'Full Body B',
        focus: 'Strength + Light Conditioning',
        exercises: [
          { name: 'Stationary Bike', sets: 1, reps: '10 min', weight: 0, unit: 'kg', notes: 'Warm-up' },
          { name: 'Goblet Squat', sets: 3, reps: '12', weight: 12, unit: 'kg', notes: '' },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: '12', weight: 10, unit: 'kg', notes: '' },
          { name: 'Lat Pulldown', sets: 3, reps: '12', weight: 35, unit: 'kg', notes: '' },
          { name: 'Reverse Lunge', sets: 3, reps: '10', weight: 8, unit: 'kg', notes: 'per leg' },
        ],
      },
      Friday: {
        name: 'Full Body C + Cardio Finisher',
        focus: 'Strength + 15 min Cardio',
        exercises: [
          { name: 'Deadlift (dumbbell)', sets: 3, reps: '12', weight: 16, unit: 'kg', notes: '' },
          { name: 'Push-Ups', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: '' },
          { name: 'Seated Row Machine', sets: 3, reps: '12', weight: 30, unit: 'kg', notes: '' },
          { name: 'Step-Ups', sets: 3, reps: '10', weight: 8, unit: 'kg', notes: 'per leg' },
          { name: 'Treadmill Jog', sets: 1, reps: '15 min', weight: 0, unit: 'kg', notes: 'Finisher — comfortable pace' },
        ],
      },
    }, 0),
  },

  // ══════════════════════════════════
  //  POWERLIFTING
  // ══════════════════════════════════
  {
    name: 'Sheiko-Inspired 4-Day Powerlifting',
    description:
      'High-frequency, high-volume powerlifting built around Boris Sheiko\'s philosophy: squat and bench 4×/week, deadlift 2×/week. Percentages-based loading off your 1RM. Develops technical mastery and raw strength simultaneously.',
    category: 'powerlifting',
    difficulty: 'advanced',
    durationWeeks: 12,
    daysPerWeek: 4,
    equipment: ['barbell', 'squat rack', 'bench', 'powerlifting belt'],
    tags: ['Sheiko', 'powerlifting', 'high frequency', 'percentage based', 'competition prep'],
    ratingAverage: 4.9,
    enrollmentCount: 820,
    workoutPlan: buildPlan(12, {
      Monday: {
        name: 'Monday — Squat + Bench',
        focus: 'Squat Heavy / Bench Volume',
        exercises: [
          { name: 'Barbell Squat', sets: 5, reps: '5', weight: 110, unit: 'kg', notes: '~75% 1RM — technical focus' },
          { name: 'Good Morning', sets: 4, reps: '6', weight: 50, unit: 'kg', notes: '' },
          { name: 'Barbell Bench Press', sets: 4, reps: '6', weight: 90, unit: 'kg', notes: '~70% 1RM' },
          { name: 'Close Grip Bench', sets: 3, reps: '8', weight: 75, unit: 'kg', notes: '' },
        ],
      },
      Wednesday: {
        name: 'Wednesday — Deadlift + Bench',
        focus: 'Deadlift Heavy / Bench Accessory',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '4', weight: 140, unit: 'kg', notes: '~75% 1RM' },
          { name: 'Romanian Deadlift', sets: 4, reps: '6', weight: 100, unit: 'kg', notes: '' },
          { name: 'Barbell Bench Press', sets: 3, reps: '8', weight: 85, unit: 'kg', notes: '~65% 1RM' },
          { name: 'Dumbbell Row', sets: 4, reps: '10', weight: 30, unit: 'kg', notes: '' },
        ],
      },
      Friday: {
        name: 'Friday — Squat Volume + Bench Heavy',
        focus: 'Squat Volume / Bench Heavy',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '6', weight: 100, unit: 'kg', notes: '~68% 1RM' },
          { name: 'Pause Squat', sets: 3, reps: '4', weight: 90, unit: 'kg', notes: '2-sec pause at bottom' },
          { name: 'Barbell Bench Press', sets: 5, reps: '4', weight: 100, unit: 'kg', notes: '~77% 1RM' },
          { name: 'Overhead Press', sets: 3, reps: '8', weight: 55, unit: 'kg', notes: '' },
        ],
      },
      Saturday: {
        name: 'Saturday — Deadlift + Accessories',
        focus: 'Deadlift Speed / Posterior Chain',
        exercises: [
          { name: 'Deadlift', sets: 3, reps: '3', weight: 120, unit: 'kg', notes: '~65% 1RM — speed focus' },
          { name: 'Barbell Squat', sets: 3, reps: '5', weight: 95, unit: 'kg', notes: '' },
          { name: 'Pull-Ups (weighted)', sets: 4, reps: '6', weight: 10, unit: 'kg', notes: '' },
          { name: 'Barbell Row', sets: 4, reps: '8', weight: 70, unit: 'kg', notes: '' },
        ],
      },
    }, 2.5),
  },

  {
    name: 'Starting Strength 3-Day Powerlifting Base',
    description:
      'Mark Rippetoe\'s foundational barbell program adapted for powerlifting development. Three full-body sessions per week focused entirely on squat, press, and deadlift. Add weight every single session. Best for lifters building their base.',
    category: 'powerlifting',
    difficulty: 'beginner',
    durationWeeks: 16,
    daysPerWeek: 3,
    equipment: ['barbell', 'squat rack', 'bench'],
    tags: ['Starting Strength', 'Rippetoe', 'beginner', 'powerlifting', 'barbell'],
    ratingAverage: 4.8,
    enrollmentCount: 2600,
    workoutPlan: buildPlan(16, {
      Monday: {
        name: 'Workout A',
        focus: 'Squat / Press / Deadlift',
        exercises: [
          { name: 'Barbell Squat', sets: 3, reps: '5', weight: 80, unit: 'kg', notes: 'Add 2.5 kg every session' },
          { name: 'Barbell Bench Press', sets: 3, reps: '5', weight: 65, unit: 'kg', notes: 'Alternate with OHP' },
          { name: 'Deadlift', sets: 1, reps: '5', weight: 100, unit: 'kg', notes: 'Add 5 kg every session' },
        ],
      },
      Wednesday: {
        name: 'Workout B',
        focus: 'Squat / OHP / Power Clean',
        exercises: [
          { name: 'Barbell Squat', sets: 3, reps: '5', weight: 82.5, unit: 'kg', notes: 'Add 2.5 kg every session' },
          { name: 'Overhead Press', sets: 3, reps: '5', weight: 45, unit: 'kg', notes: 'Alternate with bench' },
          { name: 'Power Clean', sets: 5, reps: '3', weight: 50, unit: 'kg', notes: 'Or barbell row if no clean' },
        ],
      },
      Friday: {
        name: 'Workout A',
        focus: 'Squat / Press / Deadlift',
        exercises: [
          { name: 'Barbell Squat', sets: 3, reps: '5', weight: 85, unit: 'kg', notes: 'Add 2.5 kg every session' },
          { name: 'Barbell Bench Press', sets: 3, reps: '5', weight: 67.5, unit: 'kg', notes: 'Alternate with OHP' },
          { name: 'Deadlift', sets: 1, reps: '5', weight: 110, unit: 'kg', notes: 'Add 5 kg every session' },
        ],
      },
    }, 3),
  },

  // ══════════════════════════════════
  //  ENDURANCE
  // ══════════════════════════════════
  {
    name: '10K Run Training — 10 Weeks',
    description:
      'A structured 10-week plan to get you from 5K fitness to completing a 10K race. Combines easy aerobic runs, tempo intervals, and a weekly long run with progressive mileage build-up. Rest days keep injury risk low.',
    category: 'endurance',
    difficulty: 'beginner',
    durationWeeks: 10,
    daysPerWeek: 4,
    equipment: ['running shoes', 'treadmill (optional)'],
    tags: ['running', '10K', 'cardio', 'endurance', 'race prep'],
    ratingAverage: 4.6,
    enrollmentCount: 1400,
    workoutPlan: (() => {
      const plan: Record<string, any> = {};
      const schedule = [
        // [easy km, tempo km, long km]
        [3, 3, 5],
        [3, 4, 6],
        [4, 4, 6],
        [4, 4, 7],
        [3, 3, 5], // deload
        [5, 5, 8],
        [5, 5, 8],
        [5, 5, 9],
        [4, 4, 7], // taper
        [3, 0, 10], // race week
      ];
      for (let w = 1; w <= 10; w++) {
        const [easy, tempo, long] = schedule[w - 1];
        plan[`week${w}`] = {
          Monday: { name: 'Easy Run', focus: 'Aerobic Base', exercises: [{ name: 'Easy Run', sets: 1, reps: `${easy} km`, weight: 0, unit: 'kg', notes: 'Conversational pace — Zone 2' }] },
          Wednesday: { name: 'Tempo Run', focus: 'Lactate Threshold', exercises: [{ name: 'Tempo Run', sets: 1, reps: `${tempo} km`, weight: 0, unit: 'kg', notes: tempo > 0 ? 'Comfortably hard — Zone 3-4' : 'Rest / light walk' }, { name: 'Strides', sets: 4, reps: '20 sec', weight: 0, unit: 'kg', notes: 'Fast but relaxed, full recovery' }] },
          Friday: { name: 'Easy Run + Strides', focus: 'Recovery Run', exercises: [{ name: 'Easy Run', sets: 1, reps: `${easy} km`, weight: 0, unit: 'kg', notes: 'Easy pace' }, { name: 'Core Circuit', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: 'Plank / Dead Bug / Bird Dog' }] },
          Sunday: { name: 'Long Run', focus: 'Endurance Build', exercises: [{ name: 'Long Run', sets: 1, reps: `${long} km`, weight: 0, unit: 'kg', notes: 'Easy pace — add 1 min walk break per km if needed' }] },
        };
      }
      return plan;
    })(),
  },

  {
    name: 'Rowing & Cycling Endurance — 8 Weeks',
    description:
      'Low-impact cardio program using the rowing machine and stationary bike. Builds aerobic capacity and muscular endurance without the joint stress of running. Pairs perfectly with a gym strength program.',
    category: 'endurance',
    difficulty: 'intermediate',
    durationWeeks: 8,
    daysPerWeek: 4,
    equipment: ['rowing machine', 'stationary bike', 'treadmill (optional)'],
    tags: ['rowing', 'cycling', 'cardio', 'low impact', 'aerobic'],
    ratingAverage: 4.3,
    enrollmentCount: 680,
    workoutPlan: (() => {
      const plan: Record<string, any> = {};
      for (let w = 1; w <= 8; w++) {
        plan[`week${w}`] = {
          Monday: { name: 'Rowing Intervals', focus: 'High Intensity Row', exercises: [{ name: 'Rowing Machine Intervals', sets: 6 + w, reps: '250m', weight: 0, unit: 'kg', notes: '2 min rest between intervals' }, { name: 'Rowing Cooldown', sets: 1, reps: '5 min', weight: 0, unit: 'kg', notes: 'Easy pace' }] },
          Wednesday: { name: 'Steady Bike', focus: 'Aerobic Cycling', exercises: [{ name: 'Stationary Bike', sets: 1, reps: `${30 + w * 3} min`, weight: 0, unit: 'kg', notes: 'Zone 2 — 65% max HR. Add resistance each week.' }] },
          Friday: { name: 'Rowing Steady State', focus: 'Aerobic Row', exercises: [{ name: 'Rowing Machine', sets: 1, reps: `${20 + w * 2} min`, weight: 0, unit: 'kg', notes: 'Comfortable pace, focus on technique' }] },
          Sunday: { name: 'Long Bike Ride', focus: 'Endurance Cycling', exercises: [{ name: 'Stationary Bike', sets: 1, reps: `${45 + w * 5} min`, weight: 0, unit: 'kg', notes: 'Easy to moderate — enjoy the ride' }] },
        };
      }
      return plan;
    })(),
  },

  // ══════════════════════════════════
  //  MOBILITY
  // ══════════════════════════════════
  {
    name: 'Daily Mobility Flow — 6 Weeks',
    description:
      'A 20-30 minute daily mobility routine targeting the hips, thoracic spine, shoulders, and ankles. Combines yoga-inspired stretches, dynamic warm-ups, and controlled joint circles. Perfect as a standalone program or complement to heavy training.',
    category: 'mobility',
    difficulty: 'beginner',
    durationWeeks: 6,
    daysPerWeek: 5,
    equipment: ['yoga mat', 'foam roller', 'resistance band (optional)'],
    tags: ['mobility', 'flexibility', 'yoga', 'recovery', 'daily'],
    ratingAverage: 4.7,
    enrollmentCount: 1900,
    workoutPlan: buildPlan(6, {
      Monday: { name: 'Hip & Ankle Mobility', focus: 'Lower Body Joint Health', exercises: [{ name: 'Hip 90/90 Stretch', sets: 3, reps: '60 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Deep Squat Hold', sets: 3, reps: '45 sec', weight: 0, unit: 'kg', notes: '' }, { name: 'Ankle Circles', sets: 2, reps: '10', weight: 0, unit: 'kg', notes: 'Each direction' }, { name: 'World\'s Greatest Stretch', sets: 3, reps: '5', weight: 0, unit: 'kg', notes: 'Per side' }] },
      Tuesday: { name: 'Thoracic & Shoulder Mobility', focus: 'Upper Body & Spine', exercises: [{ name: 'Foam Roll T-Spine', sets: 2, reps: '60 sec', weight: 0, unit: 'kg', notes: '' }, { name: 'Wall Slides', sets: 3, reps: '12', weight: 0, unit: 'kg', notes: '' }, { name: 'Shoulder Dislocates (band)', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: 'Wide grip, controlled' }, { name: 'Cat-Cow', sets: 2, reps: '12', weight: 0, unit: 'kg', notes: '' }] },
      Wednesday: { name: 'Full Body Flow', focus: 'Dynamic Mobility Circuit', exercises: [{ name: 'Leg Swing', sets: 2, reps: '10', weight: 0, unit: 'kg', notes: 'Front/back and side' }, { name: 'Inchworm', sets: 3, reps: '8', weight: 0, unit: 'kg', notes: '' }, { name: 'Pigeon Pose', sets: 3, reps: '60 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Downward Dog to Upward Dog', sets: 3, reps: '8', weight: 0, unit: 'kg', notes: '' }] },
      Thursday: { name: 'Hamstring & Lower Back', focus: 'Posterior Chain Flexibility', exercises: [{ name: 'Standing Hamstring Stretch', sets: 3, reps: '45 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Seated Forward Fold', sets: 3, reps: '60 sec', weight: 0, unit: 'kg', notes: '' }, { name: 'Supine Twist', sets: 3, reps: '45 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Child\'s Pose', sets: 2, reps: '60 sec', weight: 0, unit: 'kg', notes: '' }] },
      Friday: { name: 'Active Recovery Flow', focus: 'Gentle Full Body', exercises: [{ name: 'Sun Salutation', sets: 5, reps: '1 round', weight: 0, unit: 'kg', notes: '~3 min each, slow and controlled' }, { name: 'Figure-4 Stretch', sets: 3, reps: '60 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Neck Rolls', sets: 2, reps: '5', weight: 0, unit: 'kg', notes: 'Each direction — gentle' }] },
    }, 0),
  },

  {
    name: 'Athlete Mobility Program — 8 Weeks',
    description:
      'Sport-performance focused mobility for athletes. Combines loaded stretching, PNF techniques, and movement prep drills to improve range of motion under load. Directly transfers to better squats, deadlifts, and overhead pressing.',
    category: 'mobility',
    difficulty: 'intermediate',
    durationWeeks: 8,
    daysPerWeek: 4,
    equipment: ['resistance bands', 'foam roller', 'lacrosse ball', 'cable machine'],
    tags: ['mobility', 'athlete', 'PNF', 'loaded stretching', 'performance'],
    ratingAverage: 4.5,
    enrollmentCount: 740,
    workoutPlan: buildPlan(8, {
      Monday: { name: 'Lower Loaded Stretching', focus: 'Hip / Ankle / Knee', exercises: [{ name: 'Cossack Squat', sets: 3, reps: '8', weight: 0, unit: 'kg', notes: 'Add KB when comfortable' }, { name: 'Copenhagen Plank', sets: 3, reps: '30 sec', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Banded Hip Flexor Stretch', sets: 3, reps: '60 sec', weight: 0, unit: 'kg', notes: 'Active hip extension' }, { name: 'ATG Split Squat', sets: 3, reps: '8', weight: 0, unit: 'kg', notes: 'Knees over toes' }] },
      Wednesday: { name: 'Upper PNF Stretching', focus: 'Shoulder / Thoracic / Lat', exercises: [{ name: 'PNF Shoulder Flexion', sets: 3, reps: '5', weight: 0, unit: 'kg', notes: 'Contract 5s, relax 30s' }, { name: 'Lat Stretch (cable)', sets: 3, reps: '45 sec', weight: 5, unit: 'kg', notes: 'Light load, long stretch' }, { name: 'Thoracic Rotation (band)', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'Overhead Reach + Side Bend', sets: 3, reps: '8', weight: 0, unit: 'kg', notes: '' }] },
      Friday: { name: 'Movement Prep Circuit', focus: 'Full Body Activation', exercises: [{ name: 'Turkish Get-Up', sets: 3, reps: '3', weight: 10, unit: 'kg', notes: 'Per side — slow and controlled' }, { name: 'Windmill', sets: 3, reps: '5', weight: 12, unit: 'kg', notes: 'Per side' }, { name: 'Lateral Band Walk', sets: 3, reps: '15', weight: 0, unit: 'kg', notes: 'Per direction' }, { name: 'Glute Bridge + March', sets: 3, reps: '10', weight: 0, unit: 'kg', notes: '' }] },
      Sunday: { name: 'Recovery & Soft Tissue', focus: 'Foam Rolling + Static Stretch', exercises: [{ name: 'Foam Roll (full body)', sets: 1, reps: '15 min', weight: 0, unit: 'kg', notes: 'Quads, IT band, T-spine, lats' }, { name: 'Lacrosse Ball — Glutes & Pecs', sets: 2, reps: '2 min', weight: 0, unit: 'kg', notes: 'Per area' }, { name: 'Long Hold Hip Flexor Stretch', sets: 3, reps: '2 min', weight: 0, unit: 'kg', notes: 'Per side' }] },
    }, 0),
  },

  // ══════════════════════════════════
  //  ATHLETIC / GENERAL
  // ══════════════════════════════════
  {
    name: 'GPP — General Physical Preparedness',
    description:
      'A balanced 8-week program building all physical qualities simultaneously: strength, conditioning, mobility, and work capacity. Inspired by CrossFit methodology without sport-specific Olympic lifting. Great for athletes in any sport or anyone who wants to be broadly fit.',
    category: 'athletic',
    difficulty: 'intermediate',
    durationWeeks: 8,
    daysPerWeek: 5,
    equipment: ['barbell', 'dumbbells', 'kettlebell', 'pull-up bar', 'rowing machine'],
    tags: ['GPP', 'athletic', 'CrossFit-style', 'conditioning', 'well-rounded'],
    ratingAverage: 4.6,
    enrollmentCount: 1100,
    workoutPlan: buildPlan(8, {
      Monday: { name: 'Strength + Conditioning', focus: 'Lower Body Strength / Metcon', exercises: [{ name: 'Barbell Squat', sets: 5, reps: '5', weight: 80, unit: 'kg', notes: 'Heavy — 3 min rest' }, { name: 'Romanian Deadlift', sets: 3, reps: '8', weight: 70, unit: 'kg', notes: '' }, { name: 'AMRAP 12 min: KB Swing 15 / Box Jump 10 / Row 200m', sets: 1, reps: 'AMRAP', weight: 0, unit: 'kg', notes: 'As many rounds as possible in 12 min' }] },
      Tuesday: { name: 'Upper Strength', focus: 'Push / Pull Heavy', exercises: [{ name: 'Barbell Bench Press', sets: 5, reps: '5', weight: 75, unit: 'kg', notes: '' }, { name: 'Weighted Pull-Up', sets: 4, reps: '5', weight: 10, unit: 'kg', notes: '' }, { name: 'Overhead Press', sets: 3, reps: '8', weight: 50, unit: 'kg', notes: '' }, { name: 'Barbell Row', sets: 3, reps: '8', weight: 65, unit: 'kg', notes: '' }] },
      Wednesday: { name: 'Conditioning', focus: 'Aerobic Capacity', exercises: [{ name: 'Row 2000m', sets: 1, reps: 'For time', weight: 0, unit: 'kg', notes: 'Target <8:30' }, { name: 'Kettlebell Thruster', sets: 4, reps: '12', weight: 16, unit: 'kg', notes: '' }, { name: 'Farmer Carry', sets: 4, reps: '40m', weight: 24, unit: 'kg', notes: 'Per hand' }] },
      Thursday: { name: 'Power + Accessory', focus: 'Explosive Strength', exercises: [{ name: 'Power Clean (or DB Hang Clean)', sets: 5, reps: '3', weight: 60, unit: 'kg', notes: '2 min rest — focus on speed' }, { name: 'Box Jump', sets: 4, reps: '5', weight: 0, unit: 'kg', notes: 'Full reset each rep' }, { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', weight: 10, unit: 'kg', notes: '' }, { name: 'GHD Sit-Up / V-Up', sets: 3, reps: '15', weight: 0, unit: 'kg', notes: '' }] },
      Friday: { name: 'Long Conditioning', focus: 'Work Capacity / Endurance', exercises: [{ name: 'For Time: 5 rounds of — Run 400m / 15 Pull-Ups / 20 Push-Ups / 25 Air Squats', sets: 1, reps: 'For time', weight: 0, unit: 'kg', notes: 'Scale as needed. Target <30 min' }] },
    }, 2),
  },

  {
    name: 'Athlete Performance — 12-Week Base',
    description:
      'Sport-agnostic athletic development over 12 weeks. Periodized into 3 blocks: Foundation (weeks 1-4), Build (5-8), and Peak (9-12). Develops explosive power, multi-directional speed, and sport-transferable strength. Used by recreational and competitive athletes alike.',
    category: 'athletic',
    difficulty: 'advanced',
    durationWeeks: 12,
    daysPerWeek: 4,
    equipment: ['barbell', 'dumbbells', 'sled', 'agility ladder', 'medicine ball'],
    tags: ['athletic', 'periodization', 'power', 'speed', 'sport performance'],
    ratingAverage: 4.8,
    enrollmentCount: 590,
    workoutPlan: (() => {
      const plan: Record<string, any> = {};
      // Block 1: Foundation (weeks 1-4)
      for (let w = 1; w <= 4; w++) {
        plan[`week${w}`] = {
          Monday: { name: 'Lower Power', focus: 'Explosive Lower Body', exercises: [{ name: 'Barbell Squat', sets: 4, reps: '6', weight: 80 + (w-1)*2.5, unit: 'kg', notes: 'Controlled tempo 3-1-X' }, { name: 'Box Jump', sets: 4, reps: '5', weight: 0, unit: 'kg', notes: 'Max height — full reset' }, { name: 'Romanian Deadlift', sets: 3, reps: '8', weight: 70, unit: 'kg', notes: '' }, { name: 'Sled Push', sets: 4, reps: '20m', weight: 60, unit: 'kg', notes: '2 min rest' }] },
          Tuesday: { name: 'Upper Power', focus: 'Explosive Upper Body', exercises: [{ name: 'Barbell Bench Press', sets: 4, reps: '5', weight: 75, unit: 'kg', notes: 'Explosive concentric' }, { name: 'Medicine Ball Chest Pass', sets: 4, reps: '8', weight: 5, unit: 'kg', notes: 'Against wall — max speed' }, { name: 'Weighted Pull-Up', sets: 4, reps: '5', weight: 10, unit: 'kg', notes: '' }, { name: 'Landmine Press', sets: 3, reps: '10', weight: 30, unit: 'kg', notes: '' }] },
          Thursday: { name: 'Speed & Agility', focus: 'Multi-Directional Speed', exercises: [{ name: 'Agility Ladder Drills', sets: 6, reps: '20m', weight: 0, unit: 'kg', notes: 'Vary patterns each set' }, { name: 'Broad Jump', sets: 4, reps: '5', weight: 0, unit: 'kg', notes: 'Max distance — 2 min rest' }, { name: 'Sprint', sets: 6, reps: '30m', weight: 0, unit: 'kg', notes: '90% effort — 90s rest' }, { name: 'Lateral Band Walk', sets: 3, reps: '15', weight: 0, unit: 'kg', notes: 'Per direction' }] },
          Saturday: { name: 'Strength + Conditioning', focus: 'Full Body Strength', exercises: [{ name: 'Deadlift', sets: 4, reps: '5', weight: 110, unit: 'kg', notes: '' }, { name: 'Overhead Press', sets: 4, reps: '8', weight: 50, unit: 'kg', notes: '' }, { name: 'Farmer Carry', sets: 4, reps: '40m', weight: 32, unit: 'kg', notes: 'Per hand' }, { name: 'Assault Bike / Row', sets: 5, reps: '30 sec', weight: 0, unit: 'kg', notes: 'Max effort — 90s rest' }] },
        };
      }
      // Block 2: Build (weeks 5-8)
      for (let w = 5; w <= 8; w++) {
        plan[`week${w}`] = {
          Monday: { name: 'Lower Power (Build)', focus: 'Heavy Explosive Lower', exercises: [{ name: 'Barbell Squat', sets: 5, reps: '4', weight: 90 + (w-5)*2.5, unit: 'kg', notes: 'Heavier load this block' }, { name: 'Depth Jump', sets: 4, reps: '5', weight: 0, unit: 'kg', notes: 'Reactive — touch & go' }, { name: 'Bulgarian Split Squat', sets: 3, reps: '8', weight: 24, unit: 'kg', notes: 'Per leg' }] },
          Tuesday: { name: 'Upper Power (Build)', focus: 'Heavy Explosive Upper', exercises: [{ name: 'Incline Bench Press', sets: 4, reps: '5', weight: 70, unit: 'kg', notes: '' }, { name: 'Weighted Pull-Up', sets: 4, reps: '4', weight: 15, unit: 'kg', notes: '' }, { name: 'Med Ball Slam', sets: 4, reps: '8', weight: 8, unit: 'kg', notes: 'Max power' }] },
          Thursday: { name: 'Speed & Agility (Build)', focus: 'Peak Speed', exercises: [{ name: 'Flying Sprints', sets: 5, reps: '20m', weight: 0, unit: 'kg', notes: 'Rolling start — near max speed' }, { name: 'Lateral Bound', sets: 4, reps: '8', weight: 0, unit: 'kg', notes: 'Per side' }, { name: 'T-Drill', sets: 6, reps: '1', weight: 0, unit: 'kg', notes: 'Full rest — record times' }] },
          Saturday: { name: 'Strength + Metcon (Build)', focus: 'Heavy Strength & Work Capacity', exercises: [{ name: 'Trap Bar Deadlift', sets: 4, reps: '5', weight: 120, unit: 'kg', notes: '' }, { name: '21-15-9: Thruster / Pull-Up', sets: 1, reps: 'For time', weight: 40, unit: 'kg', notes: 'Classic "Fran" — scale load as needed' }] },
        };
      }
      // Block 3: Peak (weeks 9-12)
      for (let w = 9; w <= 12; w++) {
        plan[`week${w}`] = {
          Monday: { name: 'Lower Peak', focus: 'Max Strength & Power', exercises: [{ name: 'Barbell Squat', sets: 4, reps: '3', weight: 100 + (w-9)*5, unit: 'kg', notes: 'Near maximal — full rest' }, { name: 'Depth Drop to Sprint', sets: 5, reps: '3', weight: 0, unit: 'kg', notes: 'Drop box, immediately sprint 10m' }] },
          Tuesday: { name: 'Upper Peak', focus: 'Max Strength & Power', exercises: [{ name: 'Barbell Bench Press', sets: 4, reps: '3', weight: 85 + (w-9)*2.5, unit: 'kg', notes: 'Near maximal' }, { name: 'Explosive Push-Up', sets: 4, reps: '6', weight: 0, unit: 'kg', notes: 'Clap or hands-off-floor' }, { name: 'Weighted Pull-Up', sets: 4, reps: '3', weight: 20, unit: 'kg', notes: '' }] },
          Thursday: { name: 'Competition Prep Speed', focus: 'Race-Pace Speed', exercises: [{ name: 'Max Sprint', sets: 4, reps: '40m', weight: 0, unit: 'kg', notes: 'Full effort — 3 min rest' }, { name: 'Plyometric Circuit', sets: 3, reps: '10 min', weight: 0, unit: 'kg', notes: 'Box jump / bound / hurdle hop rotation' }] },
          Saturday: { name: 'Full Expression', focus: 'Total Physical Readiness', exercises: [{ name: 'Complex: Deadlift + Clean + Press', sets: 5, reps: '3 each', weight: 60, unit: 'kg', notes: 'No rest between movements in complex' }, { name: 'Max Effort Row 500m', sets: 3, reps: '500m', weight: 0, unit: 'kg', notes: 'Full rest — record split' }] },
        };
      }
      return plan;
    })(),
  },
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // Upsert a system "AVGJoe Team" user who owns all default programs
  const systemEmail = 'programs@avgjoe.com';
  const existing = await prisma.user.findUnique({ where: { email: systemEmail } });
  const systemUser = existing ?? await prisma.user.create({
    data: {
      email: systemEmail,
      passwordHash: await bcrypt.hash('not-a-real-password-' + Math.random(), 10),
      name: 'AVGJoe Team',
    },
  });

  console.log(`Using system user: ${systemUser.email} (${systemUser.id})`);

  let created = 0;
  let skipped = 0;

  for (const p of PROGRAMS) {
    const alreadyExists = await prisma.sharedProgram.findFirst({
      where: { creatorId: systemUser.id, name: p.name },
    });

    if (alreadyExists) {
      console.log(`  ⏭  Skipping (already exists): ${p.name}`);
      skipped++;
      continue;
    }

    await prisma.sharedProgram.create({
      data: {
        creatorId: systemUser.id,
        creatorName: 'AVGJoe Team',
        name: p.name,
        description: p.description,
        category: p.category,
        difficulty: p.difficulty,
        durationWeeks: p.durationWeeks,
        daysPerWeek: p.daysPerWeek,
        equipment: j(p.equipment),
        tags: j(p.tags),
        workoutPlan: j(p.workoutPlan),
        ratingAverage: p.ratingAverage,
        enrollmentCount: p.enrollmentCount,
        isPublished: true,
      },
    });

    console.log(`  ✅ Created: ${p.name} (${p.category} / ${p.difficulty})`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
