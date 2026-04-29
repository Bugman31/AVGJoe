import { exerciseLibrary } from '../data/exerciseLibrary';

export interface SetRecommendation {
  nextWeight?: number;
  nextReps?: number;
  nextRestSeconds?: number;
  action: 'increase' | 'decrease' | 'hold' | 'stop' | 'add_rest';
  reason: string;
}

export interface RecommendInput {
  exerciseName: string;
  actualWeight?: number;
  actualReps?: number;
  rpe?: number;
  targetRepMin?: number;
  targetRepMax?: number;
  progressionType?: 'strength' | 'hypertrophy' | 'conditioning';
}

const LOWER_MUSCLES = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'inner_thigh', 'lower_back']);

function isLowerBody(exerciseName: string): boolean {
  const entry = exerciseLibrary.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (entry) {
    return entry.muscleGroups.some((m) => LOWER_MUSCLES.has(m));
  }
  // Heuristic fallback for exercises not in the library
  const lower = exerciseName.toLowerCase();
  return (
    lower.includes('squat') ||
    lower.includes('deadlift') ||
    lower.includes('lunge') ||
    lower.includes('leg ') ||
    lower.includes('hip') ||
    lower.includes('calf') ||
    lower.includes('glute') ||
    lower.includes('hamstring') ||
    lower.includes('rdl')
  );
}

/** Round weight to the nearest increment (5 lb default). */
function roundToIncrement(weight: number, increment = 5): number {
  return Math.round(weight / increment) * increment;
}

export function recommend(input: RecommendInput): SetRecommendation {
  const {
    exerciseName,
    actualWeight = 0,
    actualReps,
    rpe,
    targetRepMin,
    targetRepMax,
    progressionType = 'strength',
  } = input;

  // Conditioning: no weight-based recommendation
  if (progressionType === 'conditioning') {
    return {
      action: 'hold',
      reason: 'Track effort and aim to match or improve this performance next session.',
    };
  }

  // Can't recommend without core data
  if (
    actualReps == null ||
    rpe == null ||
    targetRepMin == null ||
    targetRepMax == null
  ) {
    return {
      action: 'hold',
      reason: 'Complete more sets with RPE logged to get a progression recommendation.',
    };
  }

  const lower = isLowerBody(exerciseName);
  const increment = lower ? 10 : 5;

  if (progressionType === 'strength') {
    // Near-failure or missed reps
    if (actualReps < targetRepMin || rpe >= 9.5) {
      const reduction = roundToIncrement(actualWeight * 0.075, 5);
      const nextWeight = Math.max(actualWeight - Math.max(reduction, increment), 0);
      const trigger =
        rpe >= 9.5
          ? `RPE ${rpe} is near-maximal`
          : `missed target reps (got ${actualReps}, needed ${targetRepMin})`;
      return {
        nextWeight,
        nextRestSeconds: 60,
        action: 'decrease',
        reason: `${trigger} — drop to ${nextWeight} lbs and take extra rest before the next set.`,
      };
    }

    // Hit top of range with capacity remaining
    if (actualReps >= targetRepMax && rpe <= 8) {
      const nextWeight = actualWeight + increment;
      return {
        nextWeight,
        action: 'increase',
        reason: `${actualReps} reps at RPE ${rpe} — increase to ${nextWeight} lbs next set.`,
      };
    }

    // In the working zone
    return {
      nextWeight: actualWeight,
      action: 'hold',
      reason: `${actualReps} reps at RPE ${rpe} — good working weight, stay at ${actualWeight} lbs.`,
    };
  }

  // Hypertrophy / double progression
  if (actualReps < targetRepMin || rpe >= 9.5) {
    const nextWeight = Math.max(actualWeight - increment, 0);
    return {
      nextWeight,
      action: 'decrease',
      reason: `Reps fell short or RPE too high — reduce to ${nextWeight} lbs next set.`,
    };
  }

  if (actualReps >= targetRepMax && rpe <= 8) {
    const nextWeight = actualWeight + increment;
    return {
      nextWeight,
      action: 'increase',
      reason: `Completed full range at RPE ${rpe} — bump to ${nextWeight} lbs next session.`,
    };
  }

  return {
    nextWeight: actualWeight,
    action: 'hold',
    reason: `Good set — maintain ${actualWeight} lbs and work toward hitting ${targetRepMax} reps consistently.`,
  };
}
