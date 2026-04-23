import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Preloaded template definitions ────────────────────────────────────────

const PRELOADED_TEMPLATES = [
  {
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps — pressing movements.',
    exercises: [
      { name: 'Barbell Bench Press', orderIndex: 0, notes: 'Control the descent, full range of motion', sets: [1,2,3,4].map(n => ({ setNumber: n, targetReps: 6, targetWeight: null, unit: 'lbs' })) },
      { name: 'Overhead Press', orderIndex: 1, notes: 'Brace your core, avoid hyperextending lower back', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 8, targetWeight: null, unit: 'lbs' })) },
      { name: 'Incline Dumbbell Press', orderIndex: 2, notes: '30–45° incline', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
      { name: 'Lateral Raises', orderIndex: 3, notes: 'Light weight, controlled tempo', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 15, targetWeight: null, unit: 'lbs' })) },
      { name: 'Tricep Pushdowns', orderIndex: 4, notes: 'Cable or band', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 12, targetWeight: null, unit: 'lbs' })) },
    ],
  },
  {
    name: 'Pull Day',
    description: 'Back and biceps — pulling movements.',
    exercises: [
      { name: 'Pull-ups', orderIndex: 0, notes: 'Use bands for assistance if needed. Full hang at bottom.', sets: [1,2,3,4].map(n => ({ setNumber: n, targetReps: 6, targetWeight: null, unit: 'lbs' })) },
      { name: 'Barbell Row', orderIndex: 1, notes: 'Hinge at hips, row to lower chest', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 8, targetWeight: null, unit: 'lbs' })) },
      { name: 'Seated Cable Row', orderIndex: 2, notes: 'Neutral grip, retract scapula at top', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
      { name: 'Face Pulls', orderIndex: 3, notes: 'Cable at eye height, pull to ears', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 15, targetWeight: null, unit: 'lbs' })) },
      { name: 'Barbell Curls', orderIndex: 4, notes: 'Controlled negatives', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
    ],
  },
  {
    name: 'Leg Day',
    description: 'Quads, hamstrings, and glutes.',
    exercises: [
      { name: 'Barbell Back Squat', orderIndex: 0, notes: 'Depth to parallel or below. Brace and breathe.', sets: [1,2,3,4].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
      { name: 'Romanian Deadlift', orderIndex: 1, notes: 'Soft knee bend, push hips back', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 8, targetWeight: null, unit: 'lbs' })) },
      { name: 'Leg Press', orderIndex: 2, notes: 'Full range, feet shoulder width', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
      { name: 'Walking Lunges', orderIndex: 3, notes: 'Bodyweight or dumbbells', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 12, targetWeight: null, unit: 'lbs' })) },
      { name: 'Calf Raises', orderIndex: 4, notes: 'Pause at top and bottom', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 15, targetWeight: null, unit: 'lbs' })) },
    ],
  },
  {
    name: 'Full Body A',
    description: 'Squat-focused full body session.',
    exercises: [
      { name: 'Barbell Back Squat', orderIndex: 0, notes: 'Primary movement. Work up to a challenging set of 5.', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
      { name: 'Barbell Bench Press', orderIndex: 1, notes: '3 sets across at same weight', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
      { name: 'Barbell Row', orderIndex: 2, notes: 'Overhand grip, pull to lower chest', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
    ],
  },
  {
    name: 'Full Body B',
    description: 'Deadlift-focused full body session.',
    exercises: [
      { name: 'Deadlift', orderIndex: 0, notes: 'One top set of 5. Push the floor away.', sets: [{ setNumber: 1, targetReps: 5, targetWeight: null, unit: 'lbs' }] },
      { name: 'Overhead Press', orderIndex: 1, notes: '3 sets across', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
      { name: 'Pull-ups', orderIndex: 2, notes: 'Bodyweight — as many reps as possible each set', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 5, targetWeight: null, unit: 'lbs' })) },
    ],
  },
  {
    name: 'Upper Body',
    description: 'Balanced upper body — push and pull.',
    exercises: [
      { name: 'Barbell Bench Press', orderIndex: 0, notes: 'Work up over 3 sets', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 8, targetWeight: null, unit: 'lbs' })) },
      { name: 'Barbell Row', orderIndex: 1, notes: 'Match pressing volume with pulling', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 8, targetWeight: null, unit: 'lbs' })) },
      { name: 'Overhead Press', orderIndex: 2, notes: 'Standing or seated', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
      { name: 'Dumbbell Row', orderIndex: 3, notes: 'Single arm, elbow to hip', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 10, targetWeight: null, unit: 'lbs' })) },
      { name: 'Face Pulls', orderIndex: 4, notes: 'Rear delts and external rotation', sets: [1,2,3].map(n => ({ setNumber: n, targetReps: 15, targetWeight: null, unit: 'lbs' })) },
    ],
  },
];

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

  // Seed preloaded workout templates (idempotent — skip if name already exists for this user)
  let seeded = 0;
  for (const tmpl of PRELOADED_TEMPLATES) {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { userId: admin.id, name: tmpl.name, source: 'preloaded' },
    });
    if (existing) continue;

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
            sets: {
              create: ex.sets.map((s) => ({
                setNumber: s.setNumber,
                targetReps: s.targetReps,
                targetWeight: s.targetWeight,
                unit: s.unit,
              })),
            },
          })),
        },
      },
    });
    seeded++;
  }

  if (seeded > 0) console.log(`✅ ${seeded} preloaded workout templates created`);
  else console.log('Preloaded templates already exist');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
