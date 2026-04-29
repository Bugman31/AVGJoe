import { prisma } from '../utils/prisma';

const REVIEWER_EMAILS = ['reviewer@avgjoe.com'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type DayName = (typeof DAY_NAMES)[number];

interface PlannedExerciseSeed {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: Array<{
    setNumber: number;
    targetReps: number;
    targetWeight: number;
    unit: 'lbs';
    rpeTarget?: string;
  }>;
}

interface LoggedSetSeed {
  exerciseName: string;
  setNumber: number;
  actualReps: number;
  actualWeight: number;
  unit: 'lbs';
  rpe: number;
}

interface CompletedSessionSeed {
  name: string;
  startedAt: Date;
  completedAt: Date;
  notes: string;
  completionScore: number;
  performanceScore: number;
  workoutScore: number;
  scoreLabel: string;
  plannedWorkoutId?: string;
  programId?: string;
  sets: LoggedSetSeed[];
}

interface DemoProgramSeed {
  programId: string;
  currentWeek: number;
  currentWeekWorkoutIds: string[];
}

export function isReviewerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return REVIEWER_EMAILS.includes(email.trim().toLowerCase());
}

export async function ensureReviewerDemoData(
  userId: string,
  email: string | null | undefined,
  name: string | null | undefined
): Promise<void> {
  if (!isReviewerEmail(email)) return;

  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      primaryGoal: 'build_muscle',
      secondaryGoals: JSON.stringify(['strength', 'consistency']),
      experienceLevel: 'intermediate',
      daysPerWeek: 3,
      sessionDurationMins: 60,
      preferredSplit: 'full_body',
      availableEquipment: JSON.stringify([
        'barbell',
        'dumbbells',
        'bench',
        'cable_machine',
        'pullup_bar',
      ]),
      restrictions: JSON.stringify([]),
      injuryFlags: JSON.stringify([]),
      workoutEnvironment: 'commercial_gym',
      priorityAreas: JSON.stringify(['chest', 'back', 'legs']),
      programStyle: 'structured',
      benchmarkSquat: 185,
      benchmarkDeadlift: 245,
      benchmarkBench: 155,
      benchmarkPress: 95,
      bodyweight: 184,
      bodyFatPercent: 18.2,
      unitSystem: 'lbs',
      onboardingCompleted: true,
      aiCoachingSummary:
        'App Review account with a preloaded 3-day full-body plan, recent lifting history, and sample progress data for evaluation.',
    },
    create: {
      userId,
      primaryGoal: 'build_muscle',
      secondaryGoals: JSON.stringify(['strength', 'consistency']),
      experienceLevel: 'intermediate',
      daysPerWeek: 3,
      sessionDurationMins: 60,
      preferredSplit: 'full_body',
      availableEquipment: JSON.stringify([
        'barbell',
        'dumbbells',
        'bench',
        'cable_machine',
        'pullup_bar',
      ]),
      restrictions: JSON.stringify([]),
      injuryFlags: JSON.stringify([]),
      workoutEnvironment: 'commercial_gym',
      priorityAreas: JSON.stringify(['chest', 'back', 'legs']),
      programStyle: 'structured',
      benchmarkSquat: 185,
      benchmarkDeadlift: 245,
      benchmarkBench: 155,
      benchmarkPress: 95,
      bodyweight: 184,
      bodyFatPercent: 18.2,
      unitSystem: 'lbs',
      onboardingCompleted: true,
      aiCoachingSummary:
        'App Review account with a preloaded 3-day full-body plan, recent lifting history, and sample progress data for evaluation.',
    },
  });

  const [activeProgramCount, sessionCount, bodyLogCount] = await Promise.all([
    prisma.program.count({ where: { userId, status: 'active' } }),
    prisma.workoutSession.count({ where: { userId } }),
    prisma.bodyLog.count({ where: { userId } }),
  ]);

  if (activeProgramCount > 0 || sessionCount > 0 || bodyLogCount > 0) {
    return;
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      userId,
      name: `App Review Demo Template${name ? ` for ${name}` : ''}`,
      description: 'Preloaded template for the App Store review account.',
      source: 'app_review_seed',
      exercises: {
        create: [
          {
            name: 'Bench Press',
            orderIndex: 0,
            sets: {
              create: [
                { setNumber: 1, targetReps: 8, targetWeight: 135, unit: 'lbs' },
                { setNumber: 2, targetReps: 8, targetWeight: 135, unit: 'lbs' },
                { setNumber: 3, targetReps: 8, targetWeight: 135, unit: 'lbs' },
              ],
            },
          },
          {
            name: 'Goblet Squat',
            orderIndex: 1,
            sets: {
              create: [
                { setNumber: 1, targetReps: 10, targetWeight: 70, unit: 'lbs' },
                { setNumber: 2, targetReps: 10, targetWeight: 70, unit: 'lbs' },
                { setNumber: 3, targetReps: 10, targetWeight: 70, unit: 'lbs' },
              ],
            },
          },
          {
            name: 'Seated Cable Row',
            orderIndex: 2,
            sets: {
              create: [
                { setNumber: 1, targetReps: 10, targetWeight: 110, unit: 'lbs' },
                { setNumber: 2, targetReps: 10, targetWeight: 110, unit: 'lbs' },
                { setNumber: 3, targetReps: 10, targetWeight: 110, unit: 'lbs' },
              ],
            },
          },
          {
            name: 'Romanian Deadlift',
            orderIndex: 3,
            sets: {
              create: [
                { setNumber: 1, targetReps: 8, targetWeight: 155, unit: 'lbs' },
                { setNumber: 2, targetReps: 8, targetWeight: 155, unit: 'lbs' },
                { setNumber: 3, targetReps: 8, targetWeight: 155, unit: 'lbs' },
              ],
            },
          },
          {
            name: 'Overhead Press',
            orderIndex: 4,
            sets: {
              create: [
                { setNumber: 1, targetReps: 8, targetWeight: 85, unit: 'lbs' },
                { setNumber: 2, targetReps: 8, targetWeight: 85, unit: 'lbs' },
                { setNumber: 3, targetReps: 8, targetWeight: 85, unit: 'lbs' },
              ],
            },
          },
          {
            name: 'Lat Pulldown',
            orderIndex: 5,
            sets: {
              create: [
                { setNumber: 1, targetReps: 10, targetWeight: 120, unit: 'lbs' },
                { setNumber: 2, targetReps: 10, targetWeight: 120, unit: 'lbs' },
                { setNumber: 3, targetReps: 10, targetWeight: 120, unit: 'lbs' },
              ],
            },
          },
        ],
      },
    },
    include: { exercises: true },
  });

  const exerciseIds = new Map(template.exercises.map((exercise) => [exercise.name, exercise.id]));
  const programSeed = await createDemoProgram(userId);
  const completedSessions = buildCompletedSessions(programSeed);

  for (const sessionSeed of completedSessions) {
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        templateId: template.id,
        plannedWorkoutId: sessionSeed.plannedWorkoutId,
        programId: sessionSeed.programId,
        name: sessionSeed.name,
        startedAt: sessionSeed.startedAt,
        completedAt: sessionSeed.completedAt,
        notes: sessionSeed.notes,
        preEnergyLevel: 7,
        postEnergyLevel: 6,
        sorenessLevel: 5,
        completionScore: sessionSeed.completionScore,
        performanceScore: sessionSeed.performanceScore,
        workoutScore: sessionSeed.workoutScore,
        scoreLabel: sessionSeed.scoreLabel,
        sets: {
          create: sessionSeed.sets.map((set) => ({
            exerciseId: exerciseIds.get(set.exerciseName)!,
            exerciseName: set.exerciseName,
            setNumber: set.setNumber,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
            unit: set.unit,
            rpe: set.rpe,
            completedAt: sessionSeed.completedAt,
          })),
        },
      },
      select: { id: true, plannedWorkoutId: true },
    });

    if (session.plannedWorkoutId) {
      await prisma.plannedWorkout.update({
        where: { id: session.plannedWorkoutId },
        data: {
          isCompleted: true,
          completedSessionId: session.id,
        },
      });
    }
  }

  await prisma.weeklyAnalysis.create({
    data: {
      userId,
      programId: programSeed.programId,
      weekNumber: programSeed.currentWeek,
      adherenceScore: 0.67,
      fatigueLevel: 6,
      progressionNotes:
        'Bench press and row strength are trending up. Keep today\'s workout moderate and aim for clean reps before adding load.',
      adjustments: JSON.stringify([
        'Keep bench press at 140 lbs for today before progressing next week.',
        'Reduce Romanian deadlift effort slightly if lower-back fatigue is above normal.',
      ]),
      recommendations: JSON.stringify([
        'Use the AI Coach during the active workout to review your next weight jump.',
        'Check Progress -> Insights to see the recent RPE and consistency trends.',
      ]),
      weekSummary:
        'Sample review analysis for the current week so the App Review account can evaluate the full program workflow.',
      rawAiOutput: JSON.stringify({
        source: 'app_review_seed',
      }),
    },
  });

  await prisma.bodyLog.createMany({
    data: buildBodyLogs(userId),
  });
}

async function createDemoProgram(userId: string): Promise<DemoProgramSeed> {
  const now = new Date();
  const currentWeek = 2;
  const today = DAY_NAMES[now.getDay()];
  const previousDay = DAY_NAMES[(now.getDay() + 6) % 7];
  const nextDay = DAY_NAMES[(now.getDay() + 1) % 7];

  const weekOneDays: DayName[] = ['Monday', 'Wednesday', 'Friday'];
  const weekTwoDays: DayName[] = [previousDay, today, nextDay];
  const weekOneDates = weekOneDays.map((day) => dateForDay(day, -1));
  const weekTwoDates = weekTwoDays.map((day) => dateForDay(day, 0));

  const weekOneWorkouts = [
    buildPlannedWorkout(userId, 1, 'Full Body A', 'Push focus with squat support', weekOneDays[0], weekOneDates[0], buildWorkoutA()),
    buildPlannedWorkout(userId, 1, 'Full Body B', 'Posterior chain and shoulders', weekOneDays[1], weekOneDates[1], buildWorkoutB()),
    buildPlannedWorkout(userId, 1, 'Full Body C', 'Upper-body volume and unilateral legs', weekOneDays[2], weekOneDates[2], buildWorkoutC()),
  ];

  const weekTwoWorkouts = [
    buildPlannedWorkout(userId, 2, 'Full Body A', 'Push focus with squat support', weekTwoDays[0], weekTwoDates[0], buildWorkoutA()),
    buildPlannedWorkout(userId, 2, 'Full Body B', 'Posterior chain and shoulders', weekTwoDays[1], weekTwoDates[1], buildWorkoutB()),
    buildPlannedWorkout(userId, 2, 'Full Body C', 'Upper-body volume and unilateral legs', weekTwoDays[2], weekTwoDates[2], buildWorkoutC()),
  ];

  const program = await prisma.program.create({
    data: {
      userId,
      name: 'App Review Demo Program',
      description: 'Preloaded sample plan for the App Store review account.',
      totalWeeks: 4,
      currentWeek,
      status: 'active',
      weeklyStructure: JSON.stringify({
        daysPerWeek: 3,
        weekOneDays,
        weekTwoDays,
      }),
      progressionRules: JSON.stringify({
        mainLifts: 'Add 5 lbs when all target reps are completed at RPE 8 or below.',
        accessories: 'Add reps first, then load.',
        conditioning: 'Keep conditioning easy on lifting weeks.',
      }),
      aiGoalSummary:
        'This sample plan is preloaded so App Review can immediately inspect scheduling, active workout logging, and progress tracking.',
      plannedWorkouts: {
        create: [...weekOneWorkouts, ...weekTwoWorkouts],
      },
    },
    include: {
      plannedWorkouts: {
        orderBy: [{ weekNumber: 'asc' }, { scheduledDate: 'asc' }],
      },
    },
  });

  const currentWeekWorkoutIds = program.plannedWorkouts
    .filter((workout) => workout.weekNumber === currentWeek)
    .map((workout) => workout.id);

  return {
    programId: program.id,
    currentWeek,
    currentWeekWorkoutIds,
  };
}

function buildPlannedWorkout(
  userId: string,
  weekNumber: number,
  name: string,
  focus: string,
  dayOfWeek: DayName,
  scheduledDate: Date,
  exercises: PlannedExerciseSeed[]
) {
  return {
    userId,
    weekNumber,
    dayOfWeek,
    scheduledDate,
    name,
    focus,
    warmup: JSON.stringify([
      '5 minutes easy cardio',
      '1 ramp-up set for each main lift',
    ]),
    exercises: JSON.stringify(exercises),
    conditioning: JSON.stringify({
      type: 'optional',
      duration: 8,
      notes: 'Easy incline walk or bike cooldown.',
    }),
    coachNotes:
      scheduledDate < startOfWeekOffset(0)
        ? 'Sample completed workout for review history.'
        : dayOfWeek === DAY_NAMES[new Date().getDay()]
          ? 'This is the suggested workout to start today during review.'
          : 'Upcoming demo workout for schedule review.',
    estimatedDuration: 55,
  };
}

function buildCompletedSessions(programSeed: DemoProgramSeed): CompletedSessionSeed[] {
  const [previousWorkoutId] = programSeed.currentWeekWorkoutIds;
  const previousWorkoutDate = daysAgo(1, 6, 45);

  return [
    {
      name: 'Upper Strength',
      startedAt: daysAgo(30, 18, 10),
      completedAt: daysAgo(30, 19, 2),
      notes: 'Felt solid after a long work day.',
      completionScore: 78,
      performanceScore: 72,
      workoutScore: 6.8,
      scoreLabel: 'Solid',
      sets: [
        set('Bench Press', 1, 8, 125, 6),
        set('Bench Press', 2, 8, 125, 6),
        set('Bench Press', 3, 7, 125, 7),
        set('Seated Cable Row', 1, 10, 100, 6),
        set('Seated Cable Row', 2, 10, 100, 6),
        set('Seated Cable Row', 3, 10, 100, 7),
      ],
    },
    {
      name: 'Lower + Pull',
      startedAt: daysAgo(23, 18, 20),
      completedAt: daysAgo(23, 19, 12),
      notes: 'Good pace, easy recovery.',
      completionScore: 82,
      performanceScore: 74,
      workoutScore: 7.2,
      scoreLabel: 'Solid',
      sets: [
        set('Goblet Squat', 1, 10, 65, 6),
        set('Goblet Squat', 2, 10, 65, 6),
        set('Goblet Squat', 3, 10, 65, 7),
        set('Lat Pulldown', 1, 10, 110, 6),
        set('Lat Pulldown', 2, 10, 110, 6),
        set('Lat Pulldown', 3, 10, 110, 7),
      ],
    },
    {
      name: 'Full Body A',
      startedAt: daysAgo(16, 6, 15),
      completedAt: daysAgo(16, 7, 10),
      notes: 'Morning workout with good energy.',
      completionScore: 88,
      performanceScore: 80,
      workoutScore: 8.1,
      scoreLabel: 'Great',
      sets: [
        set('Bench Press', 1, 8, 130, 7),
        set('Bench Press', 2, 8, 130, 7),
        set('Bench Press', 3, 8, 130, 7),
        set('Goblet Squat', 1, 10, 70, 7),
        set('Goblet Squat', 2, 10, 70, 7),
        set('Seated Cable Row', 1, 10, 105, 7),
        set('Seated Cable Row', 2, 10, 105, 7),
      ],
    },
    {
      name: 'Full Body B',
      startedAt: daysAgo(9, 6, 20),
      completedAt: daysAgo(9, 7, 18),
      notes: 'RDLs felt heavier but form stayed clean.',
      completionScore: 90,
      performanceScore: 82,
      workoutScore: 8.4,
      scoreLabel: 'Great',
      sets: [
        set('Romanian Deadlift', 1, 8, 155, 7),
        set('Romanian Deadlift', 2, 8, 155, 8),
        set('Romanian Deadlift', 3, 8, 155, 8),
        set('Overhead Press', 1, 8, 85, 7),
        set('Overhead Press', 2, 8, 85, 8),
        set('Lat Pulldown', 1, 10, 115, 7),
        set('Lat Pulldown', 2, 10, 115, 8),
      ],
    },
    {
      name: 'Full Body C',
      startedAt: daysAgo(5, 18, 5),
      completedAt: daysAgo(5, 19, 1),
      notes: 'Volume day took more effort than expected.',
      completionScore: 86,
      performanceScore: 77,
      workoutScore: 7.6,
      scoreLabel: 'Solid',
      sets: [
        set('Bench Press', 1, 8, 135, 8),
        set('Bench Press', 2, 8, 135, 8),
        set('Bench Press', 3, 7, 135, 9),
        set('Seated Cable Row', 1, 10, 110, 8),
        set('Seated Cable Row', 2, 10, 110, 8),
        set('Goblet Squat', 1, 10, 75, 8),
        set('Goblet Squat', 2, 10, 75, 8),
      ],
    },
    {
      name: 'Full Body A',
      startedAt: previousWorkoutDate,
      completedAt: daysAgo(1, 7, 38),
      notes: 'Recent benchmark session for the demo account.',
      completionScore: 94,
      performanceScore: 86,
      workoutScore: 8.9,
      scoreLabel: 'Great',
      plannedWorkoutId: previousWorkoutId,
      programId: programSeed.programId,
      sets: [
        set('Bench Press', 1, 8, 140, 8),
        set('Bench Press', 2, 8, 140, 8),
        set('Bench Press', 3, 8, 140, 9),
        set('Goblet Squat', 1, 10, 80, 8),
        set('Goblet Squat', 2, 10, 80, 8),
        set('Seated Cable Row', 1, 10, 115, 8),
        set('Seated Cable Row', 2, 10, 115, 8),
      ],
    },
    {
      name: 'Primer Session',
      startedAt: daysAgo(2, 6, 50),
      completedAt: daysAgo(2, 7, 22),
      notes: 'Short extra session to populate progress history before review.',
      completionScore: 84,
      performanceScore: 79,
      workoutScore: 7.8,
      scoreLabel: 'Solid',
      sets: [
        set('Overhead Press', 1, 8, 90, 8),
        set('Overhead Press', 2, 8, 90, 8),
        set('Lat Pulldown', 1, 10, 120, 8),
        set('Lat Pulldown', 2, 10, 120, 8),
      ],
    },
  ];
}

function buildBodyLogs(userId: string) {
  return [
    {
      userId,
      weight: 187.4,
      unit: 'lbs',
      bodyFat: 18.9,
      notes: 'Starting point for demo trend.',
      loggedAt: daysAgo(28, 7, 0),
    },
    {
      userId,
      weight: 186.2,
      unit: 'lbs',
      bodyFat: 18.7,
      notes: 'Steady progress after week one.',
      loggedAt: daysAgo(21, 7, 0),
    },
    {
      userId,
      weight: 185.8,
      unit: 'lbs',
      bodyFat: 18.5,
      notes: 'Bodyweight holding while strength climbs.',
      loggedAt: daysAgo(14, 7, 0),
    },
    {
      userId,
      weight: 184.9,
      unit: 'lbs',
      bodyFat: 18.3,
      notes: 'Recovery week check-in.',
      loggedAt: daysAgo(7, 7, 0),
    },
    {
      userId,
      weight: 184.1,
      unit: 'lbs',
      bodyFat: 18.1,
      notes: 'Most recent body log for review.',
      loggedAt: daysAgo(1, 7, 0),
    },
  ];
}

function buildWorkoutA(): PlannedExerciseSeed[] {
  return [
    {
      name: 'Bench Press',
      orderIndex: 0,
      notes: 'Leave one rep in reserve on the final set.',
      sets: [
        { setNumber: 1, targetReps: 8, targetWeight: 140, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 2, targetReps: 8, targetWeight: 140, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 8, targetWeight: 140, unit: 'lbs', rpeTarget: '8' },
      ],
    },
    {
      name: 'Goblet Squat',
      orderIndex: 1,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 80, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 10, targetWeight: 80, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 3, targetReps: 10, targetWeight: 80, unit: 'lbs', rpeTarget: '8' },
      ],
    },
    {
      name: 'Seated Cable Row',
      orderIndex: 2,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 115, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 2, targetReps: 10, targetWeight: 115, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 10, targetWeight: 115, unit: 'lbs', rpeTarget: '8' },
      ],
    },
  ];
}

function buildWorkoutB(): PlannedExerciseSeed[] {
  return [
    {
      name: 'Romanian Deadlift',
      orderIndex: 0,
      notes: 'Keep the bar close and stop if your back rounds.',
      sets: [
        { setNumber: 1, targetReps: 8, targetWeight: 160, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 8, targetWeight: 160, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 8, targetWeight: 160, unit: 'lbs', rpeTarget: '8' },
      ],
    },
    {
      name: 'Overhead Press',
      orderIndex: 1,
      sets: [
        { setNumber: 1, targetReps: 8, targetWeight: 90, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 8, targetWeight: 90, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 8, targetWeight: 90, unit: 'lbs', rpeTarget: '8' },
      ],
    },
    {
      name: 'Lat Pulldown',
      orderIndex: 2,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 120, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 10, targetWeight: 120, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 10, targetWeight: 120, unit: 'lbs', rpeTarget: '8' },
      ],
    },
  ];
}

function buildWorkoutC(): PlannedExerciseSeed[] {
  return [
    {
      name: 'Bench Press',
      orderIndex: 0,
      notes: 'Pause the first rep of each set for control.',
      sets: [
        { setNumber: 1, targetReps: 8, targetWeight: 135, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 8, targetWeight: 135, unit: 'lbs', rpeTarget: '7-8' },
        { setNumber: 3, targetReps: 8, targetWeight: 135, unit: 'lbs', rpeTarget: '8-9' },
      ],
    },
    {
      name: 'Goblet Squat',
      orderIndex: 1,
      sets: [
        { setNumber: 1, targetReps: 12, targetWeight: 75, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 12, targetWeight: 75, unit: 'lbs', rpeTarget: '8' },
        { setNumber: 3, targetReps: 12, targetWeight: 75, unit: 'lbs', rpeTarget: '8' },
      ],
    },
    {
      name: 'Seated Cable Row',
      orderIndex: 2,
      sets: [
        { setNumber: 1, targetReps: 12, targetWeight: 110, unit: 'lbs', rpeTarget: '7' },
        { setNumber: 2, targetReps: 12, targetWeight: 110, unit: 'lbs', rpeTarget: '8' },
        { setNumber: 3, targetReps: 12, targetWeight: 110, unit: 'lbs', rpeTarget: '8' },
      ],
    },
  ];
}

function set(
  exerciseName: string,
  setNumber: number,
  actualReps: number,
  actualWeight: number,
  rpe: number
): LoggedSetSeed {
  return {
    exerciseName,
    setNumber,
    actualReps,
    actualWeight,
    unit: 'lbs',
    rpe,
  };
}

function daysAgo(days: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function startOfWeekOffset(weeksOffset: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay() + weeksOffset * 7);
  return date;
}

function dateForDay(day: DayName, weekOffset: number): Date {
  const start = startOfWeekOffset(weekOffset);
  const date = new Date(start);
  date.setDate(start.getDate() + DAY_NAMES.indexOf(day));
  date.setHours(6, 30, 0, 0);
  return date;
}
