import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function sets(count: number, reps: number, unit = 'lbs') {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    targetReps: reps,
    targetWeight: null,
    unit,
  }));
}

function buildWeeklyPlan(
  weeks: number,
  dayMap: Record<string, { name: string; focus: string; exercises: Array<Record<string, unknown>> }>,
  weeklyWeightIncrease = 0,
) {
  const plan: Record<string, Record<string, unknown>> = {};

  for (let week = 1; week <= weeks; week++) {
    const weekKey = `week${week}`;
    plan[weekKey] = {};

    for (const [day, session] of Object.entries(dayMap)) {
      plan[weekKey][day] = {
        name: session.name,
        focus: session.focus,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          weight: typeof exercise.weight === 'number'
            ? Math.round((exercise.weight + weeklyWeightIncrease * (week - 1)) * 2) / 2
            : exercise.weight,
        })),
      };
    }
  }

  return plan;
}

function parseRepString(reps: string | number | undefined): number | null {
  if (reps == null) return null;
  if (typeof reps === 'number') return reps;
  const first = reps.split(/[-–]/)[0].trim().replace(/\D/g, '');
  const n = parseInt(first, 10);
  return Number.isNaN(n) ? null : n;
}

function expandWorkoutPlanToPlannedWorkouts(
  workoutPlan: unknown,
  programId: string,
  userId: string,
) {
  const plan = typeof workoutPlan === 'string' ? JSON.parse(workoutPlan) : (workoutPlan ?? {});
  const rows: Array<Record<string, unknown>> = [];

  for (const [weekKey, days] of Object.entries(plan as Record<string, unknown>)) {
    const weekNumber = parseInt(weekKey.replace(/\D/g, ''), 10);
    if (Number.isNaN(weekNumber)) continue;

    for (const [dayName, session] of Object.entries(days as Record<string, unknown>)) {
      const s = session as Record<string, unknown>;
      const rawExercises = Array.isArray(s.exercises) ? s.exercises : [];
      const plannedExercises = rawExercises.map((ex, idx) => {
        const exercise = ex as Record<string, unknown>;
        return {
          name: (exercise.name as string) ?? 'Exercise',
          orderIndex: idx,
          notes: (exercise.notes as string | undefined) ?? null,
          sets: Array.from({ length: Number(exercise.sets) || 3 }, (_, i) => ({
            setNumber: i + 1,
            targetReps: parseRepString(exercise.reps as string | number | undefined),
            targetWeight: typeof exercise.weight === 'number' ? exercise.weight : null,
            unit: (exercise.unit as string) ?? 'kg',
          })),
        };
      });

      rows.push({
        programId,
        userId,
        weekNumber,
        dayOfWeek: dayName,
        name: (s.name as string) ?? dayName,
        focus: (s.focus as string | undefined) ?? null,
        warmup: JSON.stringify([]),
        exercises: JSON.stringify(plannedExercises),
        conditioning: null,
        coachNotes: null,
        estimatedDuration: null,
        isCompleted: false,
      });
    }
  }

  return rows;
}

// ─── Preloaded template definitions ─────────────────────────────────────────
//
// Design principles:
//   • Compound lifts first, isolation last
//   • Strength compounds: 4–5 sets × 3–6 reps (2–3 min rest)
//   • Hypertrophy compounds: 3–4 sets × 6–10 reps (90 s rest)
//   • Accessory / isolation: 2–3 sets × 10–15 reps (60 s rest)
//   • Total working sets per session: 15–20 (evidence-based sweet spot)
//   • Warmup guidance embedded in description (WorkoutTemplate has no warmup field)

const PRELOADED_TEMPLATES = [
  // ── PUSH DAY ──────────────────────────────────────────────────────────────
  // Chest · Shoulders · Triceps — pressing movements
  // Target: ~65 min | 17 working sets
  {
    name: 'Push Day',
    description:
      'Chest, shoulders, and triceps. ~65 min. ' +
      'Warmup: 5 min light cardio + arm circles + 2 build-up sets on bench (50% and 70% of working weight). ' +
      'Rest 2–3 min between compound sets, 60–90 s between isolation sets.',
    exercises: [
      {
        name: 'Barbell Bench Press',
        orderIndex: 0,
        notes:
          'Grip just outside shoulder width. Retract scapulae into the bench before unracking. ' +
          'Lower the bar in a slight arc to your lower chest over 2 s, then press back up and slightly toward the rack. ' +
          'Keep feet flat, upper back tight. Do NOT bounce the bar off your chest.',
        sets: sets(4, 6),
      },
      {
        name: 'Overhead Press',
        orderIndex: 1,
        notes:
          'Take the bar from a rack at upper-chest height, grip shoulder-width. ' +
          'Brace your core and glutes before each rep — avoid leaning back. ' +
          'Press straight up until arms are fully locked overhead. Lower under control. ' +
          'Common mistake: flaring elbows too wide on the descent.',
        sets: sets(3, 8),
      },
      {
        name: 'Incline Dumbbell Press',
        orderIndex: 2,
        notes:
          'Set bench to 30–45°. Start with dumbbells at shoulder height, elbows ~75° from your torso. ' +
          'Press up and slightly inward, focusing on feeling the upper chest contract. ' +
          'Control the descent over 2–3 s — don\'t drop the weight. ' +
          'If your shoulders feel strained, reduce the incline angle.',
        sets: sets(3, 10),
      },
      {
        name: 'Dumbbell Lateral Raise',
        orderIndex: 3,
        notes:
          'Stand with a slight forward lean at the hip (10–15°). ' +
          'Raise the dumbbells laterally to just above shoulder height with a soft elbow bend. ' +
          'Lead with the elbows, not the hands. Pause briefly at the top. ' +
          'Traps should stay relaxed — if they shrug, the weight is too heavy.',
        sets: sets(3, 15),
      },
      {
        name: 'Tricep Rope Pushdown',
        orderIndex: 4,
        notes:
          'Set cable to head height. Pin elbows to your sides — they must not drift forward. ' +
          'Push the rope down and slightly apart until full elbow extension. ' +
          'Squeeze the triceps at the bottom for 1 s, then return slowly to 90°. ' +
          'Perform 10–15 controlled reps — speed is the enemy here.',
        sets: sets(3, 12),
      },
      {
        name: 'Overhead Tricep Extension',
        orderIndex: 5,
        notes:
          'Use a dumbbell, EZ-bar, or cable. Keep elbows pointing forward, not flared. ' +
          'Lower the weight behind your head until you feel a full tricep stretch, then extend. ' +
          'This targets the long head of the tricep — a muscle often undertrained with pushdowns alone.',
        sets: sets(2, 12),
      },
    ],
  },

  // ── PULL DAY ──────────────────────────────────────────────────────────────
  // Back · Biceps — pulling movements
  // Target: ~65 min | 17 working sets
  {
    name: 'Pull Day',
    description:
      'Back and biceps. ~65 min. ' +
      'Warmup: 5 min light cardio + shoulder circles + 2 build-up sets on first exercise (band pull-aparts are excellent). ' +
      'Rest 2–3 min after compound rows and pull-ups, 60–90 s after isolation.',
    exercises: [
      {
        name: 'Pull-ups',
        orderIndex: 0,
        notes:
          'Start from a full dead hang — arms fully extended every rep. ' +
          'Initiate by depressing the shoulder blades before bending the elbows. ' +
          'Pull until chin clears the bar. Use a band for assistance or add a weight belt if bodyweight is easy. ' +
          'Log the rep count as AMRAP on the last set to track progress.',
        sets: sets(4, 6),
      },
      {
        name: 'Barbell Bent-Over Row',
        orderIndex: 1,
        notes:
          'Hinge until torso is roughly 45°. Overhand grip, hands just outside your legs. ' +
          'Row the bar to your lower chest / upper abdomen — NOT your belly button. ' +
          'Drive elbows back and up; pause at the top, then lower slowly. ' +
          'Keep your lower back flat throughout — this is a hinge, not a squat.',
        sets: sets(4, 6),
      },
      {
        name: 'Seated Cable Row',
        orderIndex: 2,
        notes:
          'Sit tall with a slight forward lean to start each rep. ' +
          'Row the handle to your lower sternum, pulling elbows past your torso. ' +
          'Squeeze the shoulder blades together at the end. ' +
          'Common mistake: rocking the torso — your lower back, not momentum, should do no work here.',
        sets: sets(3, 10),
      },
      {
        name: 'Face Pulls',
        orderIndex: 3,
        notes:
          'Set the cable pulley at eye height or above with a rope attachment. ' +
          'Pull toward your face, externally rotating so your fists point upward at the end. ' +
          'Pause at full rotation, then return slowly. ' +
          'This is your shoulder-health exercise — resist the urge to go heavy. 15–20 controlled reps.',
        sets: sets(3, 15),
      },
      {
        name: 'Barbell Curl',
        orderIndex: 4,
        notes:
          'Shoulder-width grip, underhand. Pin your elbows to your sides — they must not drift forward. ' +
          'Curl to chin height, pause, then lower over 2–3 s. ' +
          'Avoid swinging your torso. If you have to swing, the weight is too heavy. ' +
          'The lowering phase builds as much bicep size as the lift — don\'t skip it.',
        sets: sets(3, 10),
      },
      {
        name: 'Hammer Curl',
        orderIndex: 5,
        notes:
          'Neutral grip (thumbs up). Works the brachialis and brachioradialis in addition to the biceps. ' +
          'Curl with control, keeping the wrist neutral throughout. ' +
          'Can be done alternating or both arms simultaneously. ' +
          'Use a lighter weight than your barbell curl.',
        sets: sets(2, 12),
      },
    ],
  },

  // ── LEG DAY ───────────────────────────────────────────────────────────────
  // Quads · Hamstrings · Glutes · Calves
  // Target: ~75 min | 17 working sets
  {
    name: 'Leg Day',
    description:
      'Quads, hamstrings, glutes, and calves. ~75 min. ' +
      'Warmup: 5–10 min bike or treadmill + leg swings + hip circles + 3 build-up sets on squat (40%, 60%, 80%). ' +
      'Rest 3–4 min after squats, 2 min after RDL and leg press, 60–90 s for isolation.',
    exercises: [
      {
        name: 'Barbell Back Squat',
        orderIndex: 0,
        notes:
          'Bar on the rear delts (high bar) or lower traps (low bar). ' +
          'Feet shoulder-width or slightly wider, toes out 15–30°. ' +
          'Big breath into your belly, brace hard. Break at the hips and knees simultaneously. ' +
          'Reach at-or-below-parallel depth, then drive through the whole foot to stand. ' +
          'Knees track over toes throughout — do not let them cave inward.',
        sets: sets(4, 5),
      },
      {
        name: 'Romanian Deadlift',
        orderIndex: 1,
        notes:
          'Start standing with bar at hip level. Push your hips back while keeping the bar close to your legs. ' +
          'Maintain a flat back and soft knee bend throughout. ' +
          'Lower until you feel a deep hamstring stretch (roughly mid-shin for most). ' +
          'Drive your hips forward to return to standing — do not hyperextend at the top.',
        sets: sets(3, 8),
      },
      {
        name: 'Leg Press',
        orderIndex: 2,
        notes:
          'Feet shoulder-width on the middle of the platform. ' +
          'Lower the sled until your knees are at 90° or knees approach your chest — full range. ' +
          'Press through the full foot, not just the toes. ' +
          'Do NOT lock your knees out fully at the top — keep a slight bend to protect the joint.',
        sets: sets(3, 12),
      },
      {
        name: 'Lying Leg Curl',
        orderIndex: 3,
        notes:
          'Lie prone with the pad positioned just above your heels (not on the Achilles). ' +
          'Curl your heels toward your glutes in a smooth arc. ' +
          'Pause briefly at peak contraction, then lower over 2–3 s. ' +
          'Avoid letting your hips rise off the bench — that means the weight is too heavy.',
        sets: sets(3, 10),
      },
      {
        name: 'Bulgarian Split Squat',
        orderIndex: 4,
        notes:
          'Rear foot elevated on a bench or box, front foot 2–3 feet out. ' +
          'Lower until rear knee nearly touches the ground, keeping front shin roughly vertical. ' +
          'Drive through the front heel to stand. Excellent for quad and glute isolation with less spinal load than squats. ' +
          'Complete all reps on one leg before switching. Use dumbbells for loading.',
        sets: sets(3, 10),
      },
      {
        name: 'Standing Calf Raise',
        orderIndex: 5,
        notes:
          'Use a slight toe-out for inner calf or toe-in for outer calf. ' +
          'Let the heel drop WELL below the platform at the bottom for a full stretch. ' +
          'Rise onto the balls of your feet and pause for a full second at the top. ' +
          'Go slower and heavier rather than bouncing — the Achilles is under extreme load here.',
        sets: sets(4, 15),
      },
    ],
  },

  // ── FULL BODY A ───────────────────────────────────────────────────────────
  // Squat · Bench · Row — linear progression session
  // Target: ~50 min | 10 working sets
  {
    name: 'Full Body A',
    description:
      'Squat-focused linear progression session. ~50 min. Inspired by Starting Strength / StrongLifts. ' +
      'Warmup: 5 min cardio + 3 build-up sets on each compound (do NOT skip — the warmup IS part of the session). ' +
      'Add 2.5–5 lb per session on squat and bench; 5 lb on row. Rest 3–5 min between sets.',
    exercises: [
      {
        name: 'Barbell Back Squat',
        orderIndex: 0,
        notes:
          'This is the primary movement of the session. ' +
          'After warmup sets, perform 3 working sets across at the SAME weight. ' +
          'Increase by 5 lb next Full Body A session if you complete all 15 reps. ' +
          'Depth to parallel or below every rep — form first, weight second.',
        sets: sets(3, 5),
      },
      {
        name: 'Barbell Bench Press',
        orderIndex: 1,
        notes:
          '3 working sets across at the same weight. ' +
          'Retract your shoulder blades and keep them pinned to the bench throughout. ' +
          'Controlled descent, explosive press. Increase by 2.5–5 lb next session if all 15 reps are completed.',
        sets: sets(3, 5),
      },
      {
        name: 'Barbell Bent-Over Row',
        orderIndex: 2,
        notes:
          'Overhand grip, torso hinged to roughly 45°. ' +
          'Row to lower chest — elbows drive back and up. ' +
          '3 sets across at the same weight. Increase by 5 lb next session. ' +
          'If form breaks down, reduce weight — a sloppy row provides no benefit.',
        sets: sets(3, 5),
      },
      {
        name: 'Ab Wheel Rollout',
        orderIndex: 3,
        notes:
          'Kneel on the floor, hands on the wheel. Roll forward until your body is nearly parallel to the ground. ' +
          'Keep your lower back flat — do not let it arch. ' +
          'Pull back using your core, not momentum. Start with a limited range until you build stability.',
        sets: sets(2, 10),
      },
    ],
  },

  // ── FULL BODY B ───────────────────────────────────────────────────────────
  // OHP · Deadlift · Pull-ups — linear progression session
  // Target: ~45 min | 8 working sets
  {
    name: 'Full Body B',
    description:
      'Deadlift-focused linear progression session. ~45 min. Pairs with Full Body A on alternating days (Mon/Wed/Fri). ' +
      'Warmup: 5 min cardio + 4 build-up sets on deadlift (40%, 55%, 70%, 85%). ' +
      'Add 5 lb per session on deadlift, 2.5 lb on OHP. Rest 3–5 min between sets.',
    exercises: [
      {
        name: 'Overhead Press',
        orderIndex: 0,
        notes:
          '3 working sets across at the same weight. ' +
          'Standing with bar at upper chest, core and glutes braced. ' +
          'Press straight up until lockout. Avoid leaning back — the whole body is the base, not the lower back. ' +
          'Increase by 2.5 lb next Full Body B session when all 15 reps are completed.',
        sets: sets(3, 5),
      },
      {
        name: 'Deadlift',
        orderIndex: 1,
        notes:
          'ONE heavy work set of 5. This is enough — deadlifts are taxing on the CNS. ' +
          'Bar over mid-foot (1 inch from shins), hips higher than knees, shoulders over the bar. ' +
          'Take a big breath, brace, then push the floor away. The bar drags up your shins — that\'s correct. ' +
          'Increase by 5–10 lb every session. Deadlift should be the fastest-moving lift early on.',
        sets: sets(1, 5),
      },
      {
        name: 'Pull-ups',
        orderIndex: 2,
        notes:
          'Perform 3 sets, aiming for max reps each set. ' +
          'Full dead hang at the bottom, chin over bar at the top. ' +
          'As you get stronger, add a small weight plate using a dip belt. ' +
          'Pairs with the deadlift as complementary pulling work for back thickness and width.',
        sets: sets(3, 5),
      },
    ],
  },

  // ── UPPER BODY ────────────────────────────────────────────────────────────
  // Push + Pull — balanced 4-day upper/lower split option
  // Target: ~65 min | 17 working sets
  {
    name: 'Upper Body',
    description:
      'Balanced upper body — equal push and pull volume. ~65 min. ' +
      'Designed for 2× per week use in a 4-day upper/lower split. ' +
      'Warmup: 5 min cardio + band pull-aparts (2×15) + 2 build-up sets on bench. ' +
      'Rest 90 s–2 min between sets.',
    exercises: [
      {
        name: 'Barbell Bench Press',
        orderIndex: 0,
        notes:
          'Primary horizontal push. 4 sets — aim for controlled, full range of motion reps. ' +
          'Scapulae retracted and depressed, slight arch in the upper back, feet flat. ' +
          'Bar touches lower chest lightly each rep — no bouncing.',
        sets: sets(4, 8),
      },
      {
        name: 'Barbell Bent-Over Row',
        orderIndex: 1,
        notes:
          'Primary horizontal pull. Immediately follows bench to balance push/pull ratio. ' +
          'Hinge to ~45°. Overhand grip, row to lower chest. ' +
          'Focus on scapular retraction at the top — squeeze and hold for 1 s.',
        sets: sets(4, 8),
      },
      {
        name: 'Overhead Press',
        orderIndex: 2,
        notes:
          'Secondary push, targets the deltoids more than bench. Standing or seated both work. ' +
          'Keep the core braced — the OHP is a total-body stability challenge. ' +
          'If you\'re hitting shoulder discomfort, try a wider grip or seated dumbbell variant.',
        sets: sets(3, 10),
      },
      {
        name: 'Lat Pulldown',
        orderIndex: 3,
        notes:
          'Secondary vertical pull (substitutes pull-ups if you can\'t do 3 clean reps). ' +
          'Wide overhand grip. Lean back slightly, pull the bar to your upper chest. ' +
          'Lead with the elbows, not the hands. Squeeze the lats at the bottom and return slowly.',
        sets: sets(3, 10),
      },
      {
        name: 'Face Pulls',
        orderIndex: 4,
        notes:
          'Shoulder health work — should be in every upper body session. ' +
          'Cable at eye height, rope attachment. Pull to your face and externally rotate. ' +
          'Fists point upward at the end of the movement. Keep the weight light and reps deliberate.',
        sets: sets(3, 15),
      },
      {
        name: 'Dumbbell Curl',
        orderIndex: 5,
        notes:
          'Alternating or simultaneous — your choice. Supinate (rotate palm up) as you curl. ' +
          'Full range: start with arm fully extended, end with bicep fully contracted. ' +
          'Lower with control. These are a finisher — go lighter than you think you need.',
        sets: sets(2, 12),
      },
      {
        name: 'Tricep Dip',
        orderIndex: 6,
        notes:
          'Bodyweight or machine. Keep your torso upright to bias triceps (not chest). ' +
          'Lower until upper arms are parallel to the ground, then press up fully. ' +
          'If bodyweight is too hard, use a machine or band-assisted version.',
        sets: sets(2, 12),
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@avgjoe.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const reviewerEmail =
    process.env.REVIEWER_EMAIL ||
    (process.env.NODE_ENV === 'production' ? '' : 'reviewer@avgjoe.com');
  const reviewerPassword =
    process.env.REVIEWER_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? '' : 'Reviewer1234!');

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, name: 'Admin' },
    });
    console.log(`✅ Admin user created: ${admin.email}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  if (reviewerEmail && reviewerPassword) {
    let reviewer = await prisma.user.findUnique({ where: { email: reviewerEmail } });
    if (!reviewer) {
      const passwordHash = await bcrypt.hash(reviewerPassword, 12);
      reviewer = await prisma.user.create({
        data: {
          email: reviewerEmail,
          passwordHash,
          name: 'App Review',
        },
      });
      console.log(`✅ Reviewer user created: ${reviewer.email}`);
    } else {
      console.log(`Reviewer user already exists: ${reviewerEmail}`);
    }
  }

  // Seed preloaded workout templates (idempotent — skip if name already seeded)
  let seeded = 0;
  let updated = 0;

  for (const tmpl of PRELOADED_TEMPLATES) {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { userId: admin.id, name: tmpl.name, source: 'preloaded' },
    });

    if (existing) {
      // Update description and exercises in case the template was improved
      await prisma.exercise.deleteMany({ where: { templateId: existing.id } });
      await prisma.workoutTemplate.update({
        where: { id: existing.id },
        data: {
          description: tmpl.description,
          exercises: {
            create: tmpl.exercises.map((ex) => ({
              name: ex.name,
              orderIndex: ex.orderIndex,
              notes: ex.notes,
              sets: { create: ex.sets },
            })),
          },
        },
      });
      updated++;
      continue;
    }

    await prisma.workoutTemplate.create({
      data: {
        userId: admin.id,
        name: tmpl.name,
        description: tmpl.description,
        isAiGenerated: false,
        source: 'preloaded',
        exercises: {
          create: tmpl.exercises.map((ex) => ({
            name: ex.name,
            orderIndex: ex.orderIndex,
            notes: ex.notes,
            sets: { create: ex.sets },
          })),
        },
      },
    });
    seeded++;
  }

  if (seeded > 0) console.log(`✅ ${seeded} preloaded templates created`);
  if (updated > 0) console.log(`✅ ${updated} preloaded templates updated`);
  if (seeded === 0 && updated === 0) console.log('Preloaded templates already up to date');

  // ─── Seed community (shared) programs ─────────────────────────────────────
  //
  // Creates demo coaches + their shared programs so the Browse screen
  // has real content on a fresh database.  Idempotent by creatorEmail + name.

  const DEMO_COACHES = [
    {
      email: 'coach.marcus@avgjoe.com',
      name: 'Marcus J.',
      avatarUrl: 'https://api.dicebear.com/9.x/personas/png?seed=marcus&size=128',
    },
    {
      email: 'coach.sarah@avgjoe.com',
      name: 'Sarah K.',
      avatarUrl: 'https://api.dicebear.com/9.x/personas/png?seed=sarah&size=128',
    },
    {
      email: 'coach.derek@avgjoe.com',
      name: 'Derek L.',
      avatarUrl: 'https://api.dicebear.com/9.x/personas/png?seed=derek&size=128',
    },
  ];

  const DEMO_PROGRAMS = [
    {
      coachEmail: 'coach.marcus@avgjoe.com',
      name: '12-Week Strength Foundation',
      description:
        'A no-fluff linear progression program built around the squat, bench, deadlift, and press. ' +
        'Perfect for lifters who want to add real weight to the bar every session. ' +
        'Includes detailed coaching notes, warmup protocols, and deload guidance.',
      category: 'strength',
      difficulty: 'beginner',
      durationWeeks: 12,
      daysPerWeek: 3,
      coverImageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      ratingAverage: 4.8,
      enrollmentCount: 312,
      equipment: ['barbell', 'bench', 'squat rack', 'pull-up bar'],
      tags: ['strength', 'beginner', 'barbell', 'linear progression'],
      workoutPlan: buildWeeklyPlan(12, {
        Monday: {
          name: 'Full Body A',
          focus: 'Squat / Bench / Row',
          exercises: [
            { name: 'Barbell Back Squat', sets: 5, reps: '5', weight: 95, unit: 'lbs', notes: 'Leave 1-2 reps in reserve on the first week.' },
            { name: 'Barbell Bench Press', sets: 5, reps: '5', weight: 75, unit: 'lbs', notes: 'Use a full pause on the chest for your first rep.' },
            { name: 'Barbell Row', sets: 4, reps: '8', weight: 65, unit: 'lbs', notes: 'Keep your torso fixed and drive elbows back.' },
            { name: 'Walking Lunge', sets: 3, reps: '10', weight: 20, unit: 'lbs', notes: '10 reps per leg.' },
          ],
        },
        Wednesday: {
          name: 'Full Body B',
          focus: 'Deadlift / Press / Pull',
          exercises: [
            { name: 'Deadlift', sets: 4, reps: '5', weight: 115, unit: 'lbs', notes: 'Reset each rep and brace hard.' },
            { name: 'Overhead Press', sets: 4, reps: '6', weight: 55, unit: 'lbs', notes: 'Squeeze glutes and keep ribs down.' },
            { name: 'Lat Pulldown', sets: 3, reps: '10', weight: 70, unit: 'lbs', notes: 'Pull elbows to your pockets.' },
            { name: 'Goblet Squat', sets: 3, reps: '12', weight: 35, unit: 'lbs', notes: 'Use this to groove depth and control.' },
          ],
        },
        Friday: {
          name: 'Full Body C',
          focus: 'Squat / Incline / Hinge',
          exercises: [
            { name: 'Front Squat', sets: 4, reps: '6', weight: 75, unit: 'lbs', notes: 'Stay tall through the torso.' },
            { name: 'Incline Dumbbell Press', sets: 4, reps: '8', weight: 30, unit: 'lbs', notes: 'Smooth tempo on the way down.' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8', weight: 95, unit: 'lbs', notes: 'Keep the bar close to your legs.' },
            { name: 'Seated Cable Row', sets: 3, reps: '12', weight: 65, unit: 'lbs', notes: 'Pause at the chest on every rep.' },
          ],
        },
      }, 5),
    },
    {
      coachEmail: 'coach.sarah@avgjoe.com',
      name: 'Lean & Strong 8-Week',
      description:
        'Combines hypertrophy training with metabolic conditioning to build muscle and shed fat simultaneously. ' +
        '4 days a week — upper/lower split with Friday finishers. ' +
        'Moderate weights, shorter rest periods, high intensity.',
      category: 'hypertrophy',
      difficulty: 'intermediate',
      durationWeeks: 8,
      daysPerWeek: 4,
      coverImageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
      ratingAverage: 4.6,
      enrollmentCount: 187,
      equipment: ['dumbbells', 'bench', 'cable machine', 'bodyweight'],
      tags: ['hypertrophy', 'fat loss', 'upper lower', 'conditioning'],
      workoutPlan: buildWeeklyPlan(8, {
        Monday: {
          name: 'Upper Sculpt',
          focus: 'Chest / Back / Shoulders',
          exercises: [
            { name: 'Incline Dumbbell Press', sets: 4, reps: '10', weight: 25, unit: 'lbs', notes: 'Last set should feel like RPE 8.' },
            { name: 'Chest-Supported Row', sets: 4, reps: '10', weight: 30, unit: 'lbs', notes: 'Drive elbows toward hips.' },
            { name: 'Arnold Press', sets: 3, reps: '12', weight: 20, unit: 'lbs', notes: 'Stay smooth through the rotation.' },
            { name: 'Cable Face Pull', sets: 3, reps: '15', weight: 25, unit: 'lbs', notes: 'Pause at eye level.' },
          ],
        },
        Tuesday: {
          name: 'Lower Engine',
          focus: 'Legs / Glutes / Core',
          exercises: [
            { name: 'Goblet Squat', sets: 4, reps: '12', weight: 35, unit: 'lbs', notes: 'Control the bottom position.' },
            { name: 'Romanian Deadlift', sets: 4, reps: '10', weight: 65, unit: 'lbs', notes: 'Stretch hamstrings without losing posture.' },
            { name: 'Reverse Lunge', sets: 3, reps: '10', weight: 20, unit: 'lbs', notes: '10 reps per leg.' },
            { name: 'Plank', sets: 3, reps: '45', weight: undefined, unit: 'sec', notes: '45-second hold.' },
          ],
        },
        Thursday: {
          name: 'Upper Pump',
          focus: 'Back / Arms / Shoulders',
          exercises: [
            { name: 'Lat Pulldown', sets: 4, reps: '12', weight: 65, unit: 'lbs', notes: 'Full stretch at the top.' },
            { name: 'Dumbbell Bench Press', sets: 4, reps: '10', weight: 30, unit: 'lbs', notes: 'Use a slight pause at the bottom.' },
            { name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', weight: 12.5, unit: 'lbs', notes: 'Lead with the elbows.' },
            { name: 'Hammer Curl', sets: 3, reps: '12', weight: 20, unit: 'lbs', notes: 'No torso swing.' },
          ],
        },
        Friday: {
          name: 'Lower + Finisher',
          focus: 'Legs / Conditioning',
          exercises: [
            { name: 'Leg Press', sets: 4, reps: '12', weight: 140, unit: 'lbs', notes: 'Smooth lockout, no bouncing.' },
            { name: 'Hip Thrust', sets: 4, reps: '10', weight: 95, unit: 'lbs', notes: 'Pause for one second at the top.' },
            { name: 'Walking Lunge', sets: 3, reps: '12', weight: 15, unit: 'lbs', notes: '12 reps per leg.' },
            { name: 'Bike Sprint', sets: 6, reps: '20', weight: undefined, unit: 'sec', notes: '20 seconds hard, 60 seconds easy.' },
          ],
        },
      }, 2.5),
    },
    {
      coachEmail: 'coach.derek@avgjoe.com',
      name: 'Push Pull Legs Power',
      description:
        'Classic PPL with a powerlifting twist — heavy compounds in the 3-6 rep range paired with ' +
        'accessory work in the 8-12 rep range. 6 days a week for serious lifters. ' +
        'Week 4 and week 8 are programmed deload weeks.',
      category: 'powerlifting',
      difficulty: 'advanced',
      durationWeeks: 8,
      daysPerWeek: 6,
      coverImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
      ratingAverage: 4.9,
      enrollmentCount: 94,
      equipment: ['barbell', 'dumbbells', 'cable machine', 'leg press'],
      tags: ['powerlifting', 'ppl', 'advanced', 'strength'],
      workoutPlan: buildWeeklyPlan(8, {
        Monday: {
          name: 'Push Power',
          focus: 'Bench / Press / Triceps',
          exercises: [
            { name: 'Barbell Bench Press', sets: 5, reps: '5', weight: 185, unit: 'lbs', notes: 'Explode up, control down.' },
            { name: 'Overhead Press', sets: 4, reps: '6', weight: 105, unit: 'lbs', notes: 'Use a strict standing press.' },
            { name: 'Weighted Dip', sets: 4, reps: '8', weight: 25, unit: 'lbs', notes: 'Add load only if shoulders feel good.' },
            { name: 'Cable Fly', sets: 3, reps: '12', weight: 20, unit: 'lbs', notes: 'Squeeze hard in the midline.' },
          ],
        },
        Tuesday: {
          name: 'Pull Power',
          focus: 'Deadlift / Row / Biceps',
          exercises: [
            { name: 'Deadlift', sets: 4, reps: '4', weight: 255, unit: 'lbs', notes: 'Keep the bar close off the floor.' },
            { name: 'Pendlay Row', sets: 4, reps: '6', weight: 145, unit: 'lbs', notes: 'Reset each rep on the floor.' },
            { name: 'Weighted Pull-up', sets: 4, reps: '6', weight: 15, unit: 'lbs', notes: 'Use full range.' },
            { name: 'EZ-Bar Curl', sets: 3, reps: '10', weight: 60, unit: 'lbs', notes: 'Lower with control.' },
          ],
        },
        Wednesday: {
          name: 'Legs Power',
          focus: 'Squat / Posterior Chain',
          exercises: [
            { name: 'Barbell Back Squat', sets: 5, reps: '5', weight: 205, unit: 'lbs', notes: 'Brace before every rep.' },
            { name: 'Romanian Deadlift', sets: 4, reps: '8', weight: 165, unit: 'lbs', notes: 'Push hips back hard.' },
            { name: 'Leg Press', sets: 4, reps: '10', weight: 270, unit: 'lbs', notes: 'Control the descent.' },
            { name: 'Standing Calf Raise', sets: 4, reps: '12', weight: 90, unit: 'lbs', notes: 'Pause at the top.' },
          ],
        },
        Thursday: {
          name: 'Push Volume',
          focus: 'Chest / Shoulders / Triceps',
          exercises: [
            { name: 'Incline Dumbbell Press', sets: 4, reps: '10', weight: 60, unit: 'lbs', notes: 'Hard squeeze at the top.' },
            { name: 'Seated Dumbbell Shoulder Press', sets: 4, reps: '10', weight: 45, unit: 'lbs', notes: 'Do not arch off the bench.' },
            { name: 'Dumbbell Lateral Raise', sets: 4, reps: '15', weight: 20, unit: 'lbs', notes: 'Use strict reps.' },
            { name: 'Rope Pushdown', sets: 3, reps: '15', weight: 35, unit: 'lbs', notes: 'Spread the rope at the bottom.' },
          ],
        },
        Friday: {
          name: 'Pull Volume',
          focus: 'Lats / Upper Back / Arms',
          exercises: [
            { name: 'Lat Pulldown', sets: 4, reps: '10', weight: 100, unit: 'lbs', notes: 'Full stretch every rep.' },
            { name: 'Seated Cable Row', sets: 4, reps: '12', weight: 90, unit: 'lbs', notes: 'Pause at your torso.' },
            { name: 'Chest-Supported Rear Delt Fly', sets: 3, reps: '15', weight: 15, unit: 'lbs', notes: 'No momentum.' },
            { name: 'Hammer Curl', sets: 3, reps: '12', weight: 30, unit: 'lbs', notes: 'Neutral grip throughout.' },
          ],
        },
        Saturday: {
          name: 'Legs Volume',
          focus: 'Quads / Hamstrings / Glutes',
          exercises: [
            { name: 'Front Squat', sets: 4, reps: '8', weight: 155, unit: 'lbs', notes: 'Keep elbows high.' },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '10', weight: 30, unit: 'lbs', notes: '10 reps per leg.' },
            { name: 'Lying Leg Curl', sets: 4, reps: '12', weight: 70, unit: 'lbs', notes: 'Slow eccentric.' },
            { name: 'Walking Lunge', sets: 2, reps: '16', weight: 25, unit: 'lbs', notes: '16 total steps each leg.' },
          ],
        },
      }, 5),
    },
    {
      coachEmail: 'coach.sarah@avgjoe.com',
      name: 'Beginner Full Body Kickstart',
      description:
        'Three full-body sessions per week covering every major muscle group. ' +
        'Designed to teach movement patterns and build a strength base from scratch. ' +
        'No experience required — just show up and follow the plan.',
      category: 'general',
      difficulty: 'beginner',
      durationWeeks: 6,
      daysPerWeek: 3,
      coverImageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
      ratingAverage: 4.7,
      enrollmentCount: 521,
      equipment: ['dumbbells', 'bench', 'cable machine', 'bodyweight'],
      tags: ['beginner', 'full body', 'movement patterns', 'foundations'],
      workoutPlan: buildWeeklyPlan(6, {
        Monday: {
          name: 'Full Body A',
          focus: 'Squat / Push / Pull',
          exercises: [
            { name: 'Goblet Squat', sets: 3, reps: '10', weight: 25, unit: 'lbs', notes: 'Use this to learn bracing and depth.' },
            { name: 'Dumbbell Bench Press', sets: 3, reps: '10', weight: 20, unit: 'lbs', notes: 'Pause lightly at the bottom.' },
            { name: 'Seated Cable Row', sets: 3, reps: '12', weight: 50, unit: 'lbs', notes: 'Keep your chest tall.' },
            { name: 'Dead Bug', sets: 3, reps: '10', weight: undefined, unit: 'reps', notes: '10 reps per side.' },
          ],
        },
        Wednesday: {
          name: 'Full Body B',
          focus: 'Hinge / Press / Split Squat',
          exercises: [
            { name: 'Romanian Deadlift', sets: 3, reps: '10', weight: 45, unit: 'lbs', notes: 'Keep the dumbbells close.' },
            { name: 'Half-Kneeling Dumbbell Press', sets: 3, reps: '10', weight: 15, unit: 'lbs', notes: '10 reps per arm.' },
            { name: 'Lat Pulldown', sets: 3, reps: '12', weight: 45, unit: 'lbs', notes: 'Pull elbows down and back.' },
            { name: 'Split Squat', sets: 3, reps: '8', weight: 15, unit: 'lbs', notes: '8 reps per leg.' },
          ],
        },
        Friday: {
          name: 'Full Body C',
          focus: 'Lunge / Incline Press / Glutes',
          exercises: [
            { name: 'Reverse Lunge', sets: 3, reps: '8', weight: 15, unit: 'lbs', notes: '8 reps per leg.' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10', weight: 20, unit: 'lbs', notes: 'Smooth tempo.' },
            { name: 'Assisted Pull-up', sets: 3, reps: '8', weight: undefined, unit: 'reps', notes: 'Use the lightest assistance that lets you stay crisp.' },
            { name: 'Glute Bridge', sets: 3, reps: '12', weight: 25, unit: 'lbs', notes: 'Pause for one second at the top.' },
          ],
        },
      }, 2.5),
    },
  ];

  // Upsert demo coaches
  const coachMap = new Map<string, string>(); // email → id
  for (const coach of DEMO_COACHES) {
    let coachUser = await prisma.user.findUnique({ where: { email: coach.email } });
    if (!coachUser) {
      const passwordHash = await bcrypt.hash('Coach1234!', 12);
      coachUser = await prisma.user.create({
        data: {
          email: coach.email,
          passwordHash,
          name: coach.name,
          avatarUrl: coach.avatarUrl,
        },
      });
      console.log(`✅ Demo coach created: ${coach.name}`);
    } else if (!coachUser.avatarUrl) {
      // Back-fill avatar if missing
      coachUser = await prisma.user.update({
        where: { id: coachUser.id },
        data: { avatarUrl: coach.avatarUrl, name: coach.name },
      });
    }
    coachMap.set(coach.email, coachUser.id);
  }

  // Upsert demo shared programs
  let programsSeeded = 0;
  let repairedEnrollments = 0;
  for (const prog of DEMO_PROGRAMS) {
    const creatorId = coachMap.get(prog.coachEmail)!;
    const coach = DEMO_COACHES.find((c) => c.email === prog.coachEmail)!;
    const serializedEquipment = JSON.stringify(prog.equipment ?? []);
    const serializedTags = JSON.stringify(prog.tags ?? []);
    const serializedWorkoutPlan = JSON.stringify(prog.workoutPlan ?? {});

    const existing = await prisma.sharedProgram.findFirst({
      where: { creatorId, name: prog.name },
    });
    let sharedProgramId: string;
    if (existing) {
      await prisma.sharedProgram.update({
        where: { id: existing.id },
        data: {
          creatorName: coach.name,
          description: prog.description,
          category: prog.category,
          difficulty: prog.difficulty,
          durationWeeks: prog.durationWeeks,
          daysPerWeek: prog.daysPerWeek,
          coverImageUrl: prog.coverImageUrl,
          creatorAvatar: coach.avatarUrl,
          equipment: serializedEquipment,
          tags: serializedTags,
          workoutPlan: serializedWorkoutPlan,
          ratingAverage: prog.ratingAverage,
          enrollmentCount: prog.enrollmentCount,
        },
      });
      sharedProgramId = existing.id;
    } else {
      const created = await prisma.sharedProgram.create({
        data: {
          creatorId,
          creatorName: coach.name,
          creatorAvatar: coach.avatarUrl,
          coverImageUrl: prog.coverImageUrl,
          name: prog.name,
          description: prog.description,
          category: prog.category,
          difficulty: prog.difficulty,
          durationWeeks: prog.durationWeeks,
          daysPerWeek: prog.daysPerWeek,
          ratingAverage: prog.ratingAverage,
          enrollmentCount: prog.enrollmentCount,
          equipment: serializedEquipment,
          tags: serializedTags,
          workoutPlan: serializedWorkoutPlan,
          isPublished: true,
        },
      });
      sharedProgramId = created.id;
      programsSeeded++;
    }

    const enrollmentsNeedingRepair = await prisma.programEnrollment.findMany({
      where: { sharedProgramId },
      select: { programId: true, userId: true },
    });

    for (const enrollment of enrollmentsNeedingRepair) {
      const existingPlannedWorkoutCount = await prisma.plannedWorkout.count({
        where: { programId: enrollment.programId },
      });

      if (existingPlannedWorkoutCount > 0) continue;

      const workoutRows = expandWorkoutPlanToPlannedWorkouts(
        prog.workoutPlan,
        enrollment.programId,
        enrollment.userId,
      );

      if (workoutRows.length === 0) continue;

      await prisma.program.update({
        where: { id: enrollment.programId },
        data: { weeklyStructure: serializedWorkoutPlan },
      });
      await prisma.plannedWorkout.createMany({ data: workoutRows as any });
      repairedEnrollments++;
    }
  }
  if (programsSeeded > 0) console.log(`✅ ${programsSeeded} community programs seeded`);
  else console.log('Community programs already up to date');
  if (repairedEnrollments > 0) console.log(`✅ Repaired ${repairedEnrollments} enrolled community programs missing schedules`);

  // Back-fill cover images for any shared programs that are missing one
  const FALLBACK_COVERS = [
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80', // barbell squat rack
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80', // gym floor dumbbells
    'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=800&q=80', // pull up bar
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80', // running track athlete
    'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=800&q=80', // kettlebell workout
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80', // gym machine row
  ];
  const missingCover = await prisma.sharedProgram.findMany({
    where: { coverImageUrl: null },
    select: { id: true },
  });
  let backfilled = 0;
  for (let i = 0; i < missingCover.length; i++) {
    const cover = FALLBACK_COVERS[i % FALLBACK_COVERS.length];
    await prisma.sharedProgram.update({
      where: { id: missingCover[i].id },
      data: { coverImageUrl: cover },
    });
    backfilled++;
  }
  if (backfilled > 0) console.log(`✅ Back-filled cover images for ${backfilled} programs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
