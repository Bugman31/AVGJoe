export interface LibraryExercise {
  name: string;
  category: 'strength' | 'cardio' | 'mobility';
  muscleGroups: string[];
  equipment: string[];
  movementPattern: 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'core' | 'conditioning' | 'mobility';
  defaultSets: number;
  defaultReps: number;
}

export const exerciseLibrary: LibraryExercise[] = [
  // ── COMPOUND LOWER ──
  { name: 'Back Squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings', 'core'], equipment: ['barbell', 'squat_rack'], movementPattern: 'squat', defaultSets: 4, defaultReps: 5 },
  { name: 'Front Squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'core'], equipment: ['barbell', 'squat_rack'], movementPattern: 'squat', defaultSets: 4, defaultReps: 5 },
  { name: 'Goblet Squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'core'], equipment: ['dumbbell', 'kettlebell'], movementPattern: 'squat', defaultSets: 3, defaultReps: 10 },
  { name: 'Bulgarian Split Squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['dumbbell', 'barbell'], movementPattern: 'squat', defaultSets: 3, defaultReps: 10 },
  { name: 'Leg Press', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['machine'], movementPattern: 'squat', defaultSets: 4, defaultReps: 10 },
  { name: 'Hack Squat', category: 'strength', muscleGroups: ['quads', 'glutes'], equipment: ['machine'], movementPattern: 'squat', defaultSets: 4, defaultReps: 10 },
  { name: 'Deadlift', category: 'strength', muscleGroups: ['hamstrings', 'glutes', 'back', 'traps'], equipment: ['barbell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 5 },
  { name: 'Romanian Deadlift', category: 'strength', muscleGroups: ['hamstrings', 'glutes', 'lower_back'], equipment: ['barbell', 'dumbbell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 8 },
  { name: 'Trap Bar Deadlift', category: 'strength', muscleGroups: ['hamstrings', 'glutes', 'quads', 'back'], equipment: ['trap_bar'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 5 },
  { name: 'Sumo Deadlift', category: 'strength', muscleGroups: ['hamstrings', 'glutes', 'inner_thigh'], equipment: ['barbell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 5 },
  { name: 'Good Morning', category: 'strength', muscleGroups: ['hamstrings', 'glutes', 'lower_back'], equipment: ['barbell'], movementPattern: 'hinge', defaultSets: 3, defaultReps: 10 },
  { name: 'Hip Thrust', category: 'strength', muscleGroups: ['glutes', 'hamstrings'], equipment: ['barbell', 'bench'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 10 },
  { name: 'Glute Bridge', category: 'strength', muscleGroups: ['glutes', 'hamstrings'], equipment: ['bodyweight', 'barbell'], movementPattern: 'hinge', defaultSets: 3, defaultReps: 15 },
  { name: 'Step Up', category: 'strength', muscleGroups: ['quads', 'glutes'], equipment: ['dumbbell', 'barbell', 'bench'], movementPattern: 'squat', defaultSets: 3, defaultReps: 10 },
  { name: 'Lunge', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['bodyweight', 'dumbbell', 'barbell'], movementPattern: 'squat', defaultSets: 3, defaultReps: 10 },
  { name: 'Walking Lunge', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: ['bodyweight', 'dumbbell'], movementPattern: 'squat', defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Curl', category: 'strength', muscleGroups: ['hamstrings'], equipment: ['machine'], movementPattern: 'hinge', defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Extension', category: 'strength', muscleGroups: ['quads'], equipment: ['machine'], movementPattern: 'squat', defaultSets: 3, defaultReps: 12 },
  { name: 'Calf Raise', category: 'strength', muscleGroups: ['calves'], equipment: ['bodyweight', 'machine', 'dumbbell'], movementPattern: 'squat', defaultSets: 4, defaultReps: 15 },
  { name: 'Nordic Hamstring Curl', category: 'strength', muscleGroups: ['hamstrings'], equipment: ['bodyweight'], movementPattern: 'hinge', defaultSets: 3, defaultReps: 6 },

  // ── COMPOUND UPPER — PUSH ──
  { name: 'Bench Press', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['barbell', 'bench'], movementPattern: 'push', defaultSets: 4, defaultReps: 5 },
  { name: 'Incline Bench Press', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['barbell', 'bench'], movementPattern: 'push', defaultSets: 4, defaultReps: 8 },
  { name: 'Dumbbell Bench Press', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['dumbbell', 'bench'], movementPattern: 'push', defaultSets: 4, defaultReps: 10 },
  { name: 'Incline Dumbbell Press', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['dumbbell', 'bench'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },
  { name: 'Overhead Press', category: 'strength', muscleGroups: ['shoulders', 'triceps', 'core'], equipment: ['barbell'], movementPattern: 'push', defaultSets: 4, defaultReps: 5 },
  { name: 'Dumbbell Shoulder Press', category: 'strength', muscleGroups: ['shoulders', 'triceps'], equipment: ['dumbbell'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },
  { name: 'Push Up', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders', 'core'], equipment: ['bodyweight'], movementPattern: 'push', defaultSets: 3, defaultReps: 15 },
  { name: 'Dip', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: ['bodyweight', 'pull_up_bar'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },
  { name: 'Cable Chest Fly', category: 'strength', muscleGroups: ['chest'], equipment: ['cable_machine'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Chest Fly', category: 'strength', muscleGroups: ['chest'], equipment: ['dumbbell', 'bench'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Pec Deck', category: 'strength', muscleGroups: ['chest'], equipment: ['machine'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Lateral Raise', category: 'strength', muscleGroups: ['shoulders'], equipment: ['dumbbell', 'cable_machine'], movementPattern: 'push', defaultSets: 3, defaultReps: 15 },
  { name: 'Front Raise', category: 'strength', muscleGroups: ['shoulders'], equipment: ['dumbbell', 'barbell'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Arnold Press', category: 'strength', muscleGroups: ['shoulders', 'triceps'], equipment: ['dumbbell'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },

  // ── COMPOUND UPPER — PULL ──
  { name: 'Pull Up', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['pull_up_bar', 'bodyweight'], movementPattern: 'pull', defaultSets: 4, defaultReps: 6 },
  { name: 'Chin Up', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['pull_up_bar', 'bodyweight'], movementPattern: 'pull', defaultSets: 4, defaultReps: 6 },
  { name: 'Lat Pulldown', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['cable_machine'], movementPattern: 'pull', defaultSets: 4, defaultReps: 10 },
  { name: 'Barbell Row', category: 'strength', muscleGroups: ['back', 'biceps', 'rear_delts'], equipment: ['barbell'], movementPattern: 'pull', defaultSets: 4, defaultReps: 8 },
  { name: 'Dumbbell Row', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['dumbbell', 'bench'], movementPattern: 'pull', defaultSets: 4, defaultReps: 10 },
  { name: 'Seated Cable Row', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['cable_machine'], movementPattern: 'pull', defaultSets: 4, defaultReps: 10 },
  { name: 'T-Bar Row', category: 'strength', muscleGroups: ['back', 'biceps'], equipment: ['barbell'], movementPattern: 'pull', defaultSets: 4, defaultReps: 10 },
  { name: 'Face Pull', category: 'strength', muscleGroups: ['rear_delts', 'traps', 'rotator_cuff'], equipment: ['cable_machine', 'resistance_band'], movementPattern: 'pull', defaultSets: 3, defaultReps: 15 },
  { name: 'Band Pull Apart', category: 'strength', muscleGroups: ['rear_delts', 'traps'], equipment: ['resistance_band'], movementPattern: 'pull', defaultSets: 3, defaultReps: 20 },
  { name: 'Shrug', category: 'strength', muscleGroups: ['traps'], equipment: ['barbell', 'dumbbell'], movementPattern: 'pull', defaultSets: 3, defaultReps: 12 },
  { name: 'Reverse Fly', category: 'strength', muscleGroups: ['rear_delts', 'traps'], equipment: ['dumbbell', 'cable_machine'], movementPattern: 'pull', defaultSets: 3, defaultReps: 15 },

  // ── ARMS ──
  { name: 'Barbell Curl', category: 'strength', muscleGroups: ['biceps'], equipment: ['barbell'], movementPattern: 'pull', defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Curl', category: 'strength', muscleGroups: ['biceps'], equipment: ['dumbbell'], movementPattern: 'pull', defaultSets: 3, defaultReps: 12 },
  { name: 'Hammer Curl', category: 'strength', muscleGroups: ['biceps', 'brachialis'], equipment: ['dumbbell'], movementPattern: 'pull', defaultSets: 3, defaultReps: 12 },
  { name: 'Incline Dumbbell Curl', category: 'strength', muscleGroups: ['biceps'], equipment: ['dumbbell', 'bench'], movementPattern: 'pull', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Curl', category: 'strength', muscleGroups: ['biceps'], equipment: ['cable_machine'], movementPattern: 'pull', defaultSets: 3, defaultReps: 12 },
  { name: 'Preacher Curl', category: 'strength', muscleGroups: ['biceps'], equipment: ['barbell', 'machine'], movementPattern: 'pull', defaultSets: 3, defaultReps: 10 },
  { name: 'Tricep Pushdown', category: 'strength', muscleGroups: ['triceps'], equipment: ['cable_machine'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Skull Crusher', category: 'strength', muscleGroups: ['triceps'], equipment: ['barbell', 'dumbbell', 'bench'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },
  { name: 'Overhead Tricep Extension', category: 'strength', muscleGroups: ['triceps'], equipment: ['dumbbell', 'cable_machine'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Close Grip Bench Press', category: 'strength', muscleGroups: ['triceps', 'chest'], equipment: ['barbell', 'bench'], movementPattern: 'push', defaultSets: 3, defaultReps: 10 },
  { name: 'Diamond Push Up', category: 'strength', muscleGroups: ['triceps', 'chest'], equipment: ['bodyweight'], movementPattern: 'push', defaultSets: 3, defaultReps: 12 },
  { name: 'Wrist Curl', category: 'strength', muscleGroups: ['forearms'], equipment: ['dumbbell', 'barbell'], movementPattern: 'pull', defaultSets: 3, defaultReps: 15 },

  // ── CORE ──
  { name: 'Plank', category: 'strength', muscleGroups: ['core', 'transverse_abdominis'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 1 },
  { name: 'Side Plank', category: 'strength', muscleGroups: ['core', 'obliques'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 1 },
  { name: 'Ab Wheel Rollout', category: 'strength', muscleGroups: ['core', 'lats'], equipment: ['ab_wheel'], movementPattern: 'core', defaultSets: 3, defaultReps: 10 },
  { name: 'Cable Crunch', category: 'strength', muscleGroups: ['core'], equipment: ['cable_machine'], movementPattern: 'core', defaultSets: 3, defaultReps: 15 },
  { name: 'Hanging Leg Raise', category: 'strength', muscleGroups: ['core', 'hip_flexors'], equipment: ['pull_up_bar'], movementPattern: 'core', defaultSets: 3, defaultReps: 12 },
  { name: 'Crunch', category: 'strength', muscleGroups: ['core'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 20 },
  { name: 'Bicycle Crunch', category: 'strength', muscleGroups: ['core', 'obliques'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 20 },
  { name: 'Russian Twist', category: 'strength', muscleGroups: ['core', 'obliques'], equipment: ['bodyweight', 'dumbbell', 'kettlebell'], movementPattern: 'core', defaultSets: 3, defaultReps: 20 },
  { name: 'Dead Bug', category: 'strength', muscleGroups: ['core'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 10 },
  { name: 'Pallof Press', category: 'strength', muscleGroups: ['core', 'obliques'], equipment: ['cable_machine', 'resistance_band'], movementPattern: 'core', defaultSets: 3, defaultReps: 12 },
  { name: 'Hollow Body Hold', category: 'strength', muscleGroups: ['core'], equipment: ['bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 1 },
  { name: 'Dragon Flag', category: 'strength', muscleGroups: ['core', 'hip_flexors'], equipment: ['bench', 'bodyweight'], movementPattern: 'core', defaultSets: 3, defaultReps: 6 },

  // ── CARRIES ──
  { name: 'Farmer Carry', category: 'strength', muscleGroups: ['core', 'traps', 'forearms', 'legs'], equipment: ['dumbbell', 'kettlebell', 'barbell'], movementPattern: 'carry', defaultSets: 3, defaultReps: 1 },
  { name: 'Suitcase Carry', category: 'strength', muscleGroups: ['core', 'obliques', 'traps'], equipment: ['dumbbell', 'kettlebell'], movementPattern: 'carry', defaultSets: 3, defaultReps: 1 },
  { name: 'Overhead Carry', category: 'strength', muscleGroups: ['shoulders', 'core'], equipment: ['dumbbell', 'kettlebell', 'barbell'], movementPattern: 'carry', defaultSets: 3, defaultReps: 1 },

  // ── KETTLEBELL ──
  { name: 'Kettlebell Swing', category: 'strength', muscleGroups: ['glutes', 'hamstrings', 'core', 'back'], equipment: ['kettlebell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 15 },
  { name: 'Kettlebell Clean', category: 'strength', muscleGroups: ['glutes', 'hamstrings', 'shoulders'], equipment: ['kettlebell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 8 },
  { name: 'Kettlebell Press', category: 'strength', muscleGroups: ['shoulders', 'triceps', 'core'], equipment: ['kettlebell'], movementPattern: 'push', defaultSets: 3, defaultReps: 8 },
  { name: 'Kettlebell Turkish Get Up', category: 'strength', muscleGroups: ['full_body', 'core', 'shoulders'], equipment: ['kettlebell'], movementPattern: 'carry', defaultSets: 3, defaultReps: 3 },
  { name: 'Kettlebell Snatch', category: 'strength', muscleGroups: ['glutes', 'hamstrings', 'shoulders', 'core'], equipment: ['kettlebell'], movementPattern: 'hinge', defaultSets: 4, defaultReps: 8 },

  // ── CONDITIONING ──
  { name: 'Treadmill Run', category: 'cardio', muscleGroups: ['legs', 'cardio'], equipment: ['treadmill'], movementPattern: 'conditioning', defaultSets: 1, defaultReps: 1 },
  { name: 'Rowing Machine', category: 'cardio', muscleGroups: ['back', 'legs', 'cardio'], equipment: ['row_machine'], movementPattern: 'conditioning', defaultSets: 1, defaultReps: 1 },
  { name: 'Air Bike', category: 'cardio', muscleGroups: ['full_body', 'cardio'], equipment: ['air_bike'], movementPattern: 'conditioning', defaultSets: 1, defaultReps: 1 },
  { name: 'Assault Bike', category: 'cardio', muscleGroups: ['full_body', 'cardio'], equipment: ['air_bike'], movementPattern: 'conditioning', defaultSets: 1, defaultReps: 1 },
  { name: 'Jump Rope', category: 'cardio', muscleGroups: ['calves', 'cardio'], equipment: ['jump_rope'], movementPattern: 'conditioning', defaultSets: 1, defaultReps: 1 },
  { name: 'Sled Push', category: 'cardio', muscleGroups: ['legs', 'cardio'], equipment: ['sled'], movementPattern: 'conditioning', defaultSets: 4, defaultReps: 1 },
  { name: 'Sled Pull', category: 'cardio', muscleGroups: ['back', 'legs', 'cardio'], equipment: ['sled'], movementPattern: 'conditioning', defaultSets: 4, defaultReps: 1 },
  { name: 'Battle Ropes', category: 'cardio', muscleGroups: ['shoulders', 'core', 'cardio'], equipment: ['battle_ropes'], movementPattern: 'conditioning', defaultSets: 4, defaultReps: 1 },
  { name: 'Box Jump', category: 'cardio', muscleGroups: ['legs', 'cardio'], equipment: ['plyo_box'], movementPattern: 'conditioning', defaultSets: 4, defaultReps: 8 },
  { name: 'Burpee', category: 'cardio', muscleGroups: ['full_body', 'cardio'], equipment: ['bodyweight'], movementPattern: 'conditioning', defaultSets: 3, defaultReps: 10 },

  // ── MOBILITY ──
  { name: 'Hip Flexor Stretch', category: 'mobility', muscleGroups: ['hip_flexors'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 1 },
  { name: 'Thoracic Rotation', category: 'mobility', muscleGroups: ['thoracic_spine'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 10 },
  { name: "World's Greatest Stretch", category: 'mobility', muscleGroups: ['full_body'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 5 },
  { name: '90/90 Hip Stretch', category: 'mobility', muscleGroups: ['hips', 'glutes'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 1 },
  { name: 'Ankle Circles', category: 'mobility', muscleGroups: ['ankles'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 10 },
  { name: 'Shoulder Dislocates', category: 'mobility', muscleGroups: ['shoulders'], equipment: ['resistance_band'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 10 },
  { name: 'Cat Cow', category: 'mobility', muscleGroups: ['spine'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 10 },
  { name: 'Pigeon Pose', category: 'mobility', muscleGroups: ['hips', 'glutes'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 1 },
  { name: 'Couch Stretch', category: 'mobility', muscleGroups: ['hip_flexors', 'quads'], equipment: ['bodyweight'], movementPattern: 'mobility', defaultSets: 2, defaultReps: 1 },
];
