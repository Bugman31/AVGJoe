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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
