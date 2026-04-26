import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { decrypt } from '../utils/crypto';
import { createTemplate } from './workout.service';
import type { OnboardingData } from './profile.service';

// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────

interface GenerateWorkoutData {
  goal: string;
  fitnessLevel?: string;
  daysPerWeek?: number;
  equipment?: string;
  preferredSplit?: string;
  benchmarkBench?: number;
  benchmarkSquat?: number;
  benchmarkDeadlift?: number;
  benchmarkPress?: number;
  unitSystem?: string;
}

interface AiExerciseSet {
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  unit: string;
}

interface AiExercise {
  name: string;
  orderIndex: number;
  notes: string;
  sets: AiExerciseSet[];
}

interface AiWorkout {
  name: string;
  description: string;
  weekNumber: number;
  dayOfWeek: string;
  exercises: AiExercise[];
}

interface AiProgram {
  programName: string;
  programDescription: string;
  totalWeeks: number;
  workouts: AiWorkout[];
}

// ─────────────────────────────────────────────
// Helper: resolve API key for a user
// ─────────────────────────────────────────────

type AiProvider = 'anthropic' | 'openai';

interface ResolvedAi {
  provider: AiProvider;
  anthropicClient?: Anthropic;
  openaiClient?: OpenAI;
}

async function resolveAi(userId: string): Promise<ResolvedAi> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { anthropicApiKey: true, openaiApiKey: true, aiProvider: true },
  });

  const provider = (user?.aiProvider ?? 'anthropic') as AiProvider;

  if (provider === 'openai') {
    const key = user?.openaiApiKey ? decrypt(user.openaiApiKey) : env.OPENAI_API_KEY;
    if (!key) {
      const err = new Error('No OpenAI API key configured. Add your key in Profile → AI Provider.') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
    return { provider: 'openai', openaiClient: new OpenAI({ apiKey: key }) };
  }

  // Default: Anthropic
  const key = user?.anthropicApiKey ? decrypt(user.anthropicApiKey) : env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error('No AI provider configured. Add your API key in Profile → AI Provider.') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  return { provider: 'anthropic', anthropicClient: new Anthropic({ apiKey: key }) };
}

function parseJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(stripped);
}

async function callAi(
  resolved: ResolvedAi,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 8000
): Promise<string> {
  if (resolved.provider === 'openai' && resolved.openaiClient) {
    const response = await resolved.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });
    return response.choices[0]?.message?.content ?? '';
  }

  // Anthropic
  const client = resolved.anthropicClient!;
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from AI');
  return block.text;
}

async function callAiWithRetry<T>(
  resolved: ResolvedAi,
  systemPrompt: string,
  userPrompt: string,
  validate: (parsed: unknown) => parsed is T,
  maxTokens = 8000
): Promise<T> {
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: userPrompt },
  ];
  let responseText = await callAi(resolved, systemPrompt, messages, maxTokens);

  try {
    const parsed = parseJson(responseText);
    if (!validate(parsed)) throw new Error('Invalid structure');
    return parsed;
  } catch {
    messages.push({ role: 'assistant', content: responseText });
    messages.push({
      role: 'user',
      content: 'Your previous response was not valid JSON. Please respond with ONLY the JSON object, no markdown, no code blocks, no extra text.',
    });
    responseText = await callAi(resolved, systemPrompt, messages, maxTokens);
    const retryParsed = parseJson(responseText);
    if (!validate(retryParsed)) {
      const err = new Error('Failed to parse AI response. Please try again.') as Error & { statusCode: number };
      err.statusCode = 422;
      throw err;
    }
    return retryParsed;
  }
}

// ─────────────────────────────────────────────
// 1. Legacy workout generator (kept as-is)
// ─────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an expert certified personal trainer with deep knowledge of exercise science, programming, and periodization. Your role is to create safe, effective, and personalized multi-week workout programs.

When creating programs:
- Design a full multi-week program (e.g. 4 weeks) with workouts for each training day
- Each week should have progressive overload — slightly increase reps, sets, or weight over the weeks
- Scale intensity to the user's fitness level
- Include appropriate notes for each exercise (form cues, warm-up considerations)
- Use evidence-based rep/set schemes (e.g. 3-5 sets, 5-15 reps)
- STRICTLY follow the user's preferred training split — if they specify Push/Pull/Legs, every workout day must be labelled and structured as a push, pull, or leg day with only appropriate exercises for that focus. If they specify Upper/Lower, alternate upper and lower body days. Never substitute a different split than what was requested.
- If the user provides strength benchmarks (bench press, squat, deadlift, overhead press), use those numbers to set realistic targetWeight values for exercises. Working sets should generally be 65-85% of their 1RM. Use the same unit system (lbs or kg) the user specified.

You must ALWAYS respond with valid JSON matching this exact schema — no text outside the JSON:
{
  "programName": "string",
  "programDescription": "string",
  "totalWeeks": 4,
  "workouts": [
    {
      "name": "string",
      "description": "string",
      "weekNumber": 1,
      "dayOfWeek": "Monday",
      "exercises": [
        {
          "name": "string",
          "orderIndex": 0,
          "notes": "string",
          "sets": [
            {
              "setNumber": 1,
              "targetReps": 10,
              "targetWeight": null,
              "unit": "kg"
            }
          ]
        }
      ]
    }
  ]
}

dayOfWeek must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Do not include any text outside the JSON object. Do not use markdown code blocks.`;
}

function buildUserPrompt(data: GenerateWorkoutData): string {
  const unit = data.unitSystem ?? 'lbs';
  const parts = [`Create a complete multi-week workout program for: ${data.goal}`];
  if (data.fitnessLevel) parts.push(`Fitness level: ${data.fitnessLevel}`);
  if (data.daysPerWeek) parts.push(`Training days per week: ${data.daysPerWeek}`);
  if (data.preferredSplit) parts.push(`Training split (REQUIRED — do not change this): ${data.preferredSplit}`);
  if (data.equipment) parts.push(`Available equipment: ${data.equipment}`);
  parts.push(`Weight unit: ${unit}`);

  const hasBenchmarks = data.benchmarkBench || data.benchmarkSquat || data.benchmarkDeadlift || data.benchmarkPress;
  if (hasBenchmarks) {
    parts.push('Athlete strength benchmarks (use these to set targetWeight for exercises):');
    if (data.benchmarkBench) parts.push(`  Bench press 1RM: ${data.benchmarkBench} ${unit}`);
    if (data.benchmarkSquat) parts.push(`  Squat 1RM: ${data.benchmarkSquat} ${unit}`);
    if (data.benchmarkDeadlift) parts.push(`  Deadlift 1RM: ${data.benchmarkDeadlift} ${unit}`);
    if (data.benchmarkPress) parts.push(`  Overhead press 1RM: ${data.benchmarkPress} ${unit}`);
    parts.push(`Set working weights at 65-85% of the relevant 1RM. For accessory exercises without a direct benchmark, estimate based on the athlete's overall strength level.`);
  }

  parts.push('Generate a 4-week progressive program. Return ONLY the JSON object — no markdown, no explanation.');
  return parts.join('\n');
}

function validateLegacyProgram(plan: unknown): plan is AiProgram {
  if (typeof plan !== 'object' || plan === null) return false;
  const p = plan as Record<string, unknown>;
  if (typeof p.programName !== 'string') return false;
  if (!Array.isArray(p.workouts) || p.workouts.length === 0) return false;
  return true;
}

export async function generateWorkout(userId: string, data: GenerateWorkoutData) {
  const resolved = await resolveAi(userId);
  const program = await callAiWithRetry<AiProgram>(
    resolved,
    buildSystemPrompt(),
    buildUserPrompt(data),
    validateLegacyProgram,
    8000
  );

  const programId = randomUUID();
  const templates = await Promise.all(
    program.workouts.map((workout) =>
      createTemplate(userId, {
        name: workout.name,
        description: workout.description,
        isAiGenerated: true,
        aiGoal: data.goal,
        programId,
        weekNumber: workout.weekNumber,
        dayOfWeek: workout.dayOfWeek,
        exercises: workout.exercises.map((ex) => ({
          name: ex.name,
          orderIndex: ex.orderIndex,
          notes: ex.notes ?? undefined,
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps ?? undefined,
            targetWeight: s.targetWeight ?? undefined,
            unit: s.unit ?? 'kg',
          })),
        })),
      })
    )
  );

  return { programId, programName: program.programName, programDescription: program.programDescription, totalWeeks: program.totalWeeks, templates };
}

// ─────────────────────────────────────────────
// 2. Program generation from UserProfile
// ─────────────────────────────────────────────

interface AiPlannedExerciseSet {
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  rpeTarget: string | null;
  unit: string;
}

interface AiPlannedExercise {
  name: string;
  orderIndex: number;
  notes: string;
  sets: AiPlannedExerciseSet[];
}

interface AiPlannedWorkout {
  weekNumber: number;
  dayOfWeek: string;
  name: string;
  focus: string;
  estimatedDuration: number;
  warmup: Array<{ name: string; duration: string }>;
  exercises: AiPlannedExercise[];
  conditioning: { description: string; duration: string; intensity: string } | null;
  coachNotes: string;
}

interface AiGeneratedProgram {
  programName: string;
  programDescription: string;
  totalWeeks: number;
  weeklyStructure: Record<string, unknown>;
  progressionRules: Record<string, unknown>;
  aiGoalSummary: string;
  workouts: AiPlannedWorkout[];
}

// ── Step 1 schema: program skeleton (no workouts) ──

interface AiProgramStructure {
  programName: string;
  programDescription: string;
  totalWeeks: number;
  weeklyStructure: { split: string; days: string[] };
  progressionRules: { mainLifts: string; accessories: string; conditioning: string };
  aiGoalSummary: string;
}

// ── Step 2 schema: one week of workouts ──

interface AiWeekWorkouts {
  weekNumber: number;
  workouts: AiPlannedWorkout[];
}

function buildStructureSystemPrompt(): string {
  return `You are an expert certified strength and conditioning coach. Design the structure for a personalized multi-week training program.

Output ONLY valid JSON matching this exact schema — no text outside the JSON:
{
  "programName": "string",
  "programDescription": "string",
  "totalWeeks": 4,
  "weeklyStructure": {
    "split": "string (e.g. Upper/Lower, Push/Pull/Legs, Full Body)",
    "days": ["Monday", "Wednesday", "Friday", "Saturday"]
  },
  "progressionRules": {
    "mainLifts": "string (e.g. Add 5 lbs each week on primary movements)",
    "accessories": "string",
    "conditioning": "string"
  },
  "aiGoalSummary": "string — 2-3 sentence coaching profile summary"
}

Do not include any workout details. Return ONLY the JSON object. Do not use markdown code blocks.`;
}

function buildStructureUserPrompt(profile: OnboardingData): string {
  const lines: string[] = [
    'Design the training program structure for this athlete:',
    '',
    `Primary Goal: ${profile.primaryGoal}`,
    `Secondary Goals: ${profile.secondaryGoals.join(', ') || 'none'}`,
    `Experience Level: ${profile.experienceLevel}`,
    `Training Days Per Week: ${profile.daysPerWeek}`,
    `Session Duration: ${profile.sessionDurationMins} minutes`,
    `Preferred Split: ${profile.preferredSplit}`,
    `Available Equipment: ${profile.availableEquipment.join(', ') || 'bodyweight only'}`,
    `Movement Restrictions: ${profile.restrictions.join(', ') || 'none'}`,
    `Injury Flags: ${profile.injuryFlags.join(', ') || 'none'}`,
    `Workout Environment: ${profile.workoutEnvironment}`,
    `Priority Areas: ${profile.priorityAreas.join(', ') || 'general'}`,
    `Program Style: ${profile.programStyle}`,
    `Unit System: ${profile.unitSystem}`,
  ];

  if (profile.bodyweight) lines.push(`Bodyweight: ${profile.bodyweight} ${profile.unitSystem}`);
  if (profile.benchmarkSquat) lines.push(`Squat Best: ${profile.benchmarkSquat} ${profile.unitSystem}`);
  if (profile.benchmarkDeadlift) lines.push(`Deadlift Best: ${profile.benchmarkDeadlift} ${profile.unitSystem}`);
  if (profile.benchmarkBench) lines.push(`Bench Press Best: ${profile.benchmarkBench} ${profile.unitSystem}`);
  if (profile.benchmarkPress) lines.push(`Overhead Press Best: ${profile.benchmarkPress} ${profile.unitSystem}`);
  if (profile.benchmarkPullups) lines.push(`Pull-Up Max Reps: ${profile.benchmarkPullups}`);

  lines.push('', 'Return ONLY the JSON object — no markdown, no explanation.');
  return lines.join('\n');
}

function buildWeekSystemPrompt(): string {
  return `You are an expert certified strength and conditioning coach. Generate the workouts for a specific week of a training program.

Output ONLY valid JSON matching this exact schema:
{
  "weekNumber": 1,
  "workouts": [
    {
      "weekNumber": 1,
      "dayOfWeek": "Monday",
      "name": "string",
      "focus": "string (e.g. Upper Push, Lower Pull, Full Body)",
      "estimatedDuration": 60,
      "warmup": [{ "name": "string", "duration": "string (e.g. 90 sec)" }],
      "exercises": [
        {
          "name": "string",
          "orderIndex": 0,
          "notes": "string (form cues, purpose)",
          "sets": [
            {
              "setNumber": 1,
              "targetReps": 5,
              "targetWeight": null,
              "rpeTarget": "7-8",
              "unit": "lbs"
            }
          ]
        }
      ],
      "conditioning": null,
      "coachNotes": "string"
    }
  ]
}

dayOfWeek must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
conditioning can be null or: { "description": "string", "duration": "string", "intensity": "string" }
Do not include any text outside the JSON object. Do not use markdown code blocks.`;
}

function buildWeekUserPrompt(
  profile: OnboardingData,
  structure: AiProgramStructure,
  weekNumber: number
): string {
  const lines = [
    `Generate workouts for WEEK ${weekNumber} of ${structure.totalWeeks} of the "${structure.programName}" program.`,
    '',
    'Program structure:',
    `Split: ${structure.weeklyStructure.split}`,
    `Training days: ${structure.weeklyStructure.days.join(', ')}`,
    '',
    'Progression rules:',
    `Main lifts: ${structure.progressionRules.mainLifts}`,
    `Accessories: ${structure.progressionRules.accessories}`,
    '',
    'Athlete profile:',
    `Primary Goal: ${profile.primaryGoal}`,
    `Experience Level: ${profile.experienceLevel}`,
    `Session Duration: ${profile.sessionDurationMins} minutes`,
    `Available Equipment: ${profile.availableEquipment.join(', ') || 'bodyweight only'}`,
    `Unit System: ${profile.unitSystem}`,
    `Restrictions: ${profile.restrictions.join(', ') || 'none'}`,
  ];

  if (profile.benchmarkSquat) lines.push(`Squat Best: ${profile.benchmarkSquat} ${profile.unitSystem}`);
  if (profile.benchmarkDeadlift) lines.push(`Deadlift Best: ${profile.benchmarkDeadlift} ${profile.unitSystem}`);
  if (profile.benchmarkBench) lines.push(`Bench Press Best: ${profile.benchmarkBench} ${profile.unitSystem}`);

  lines.push(
    '',
    `This is week ${weekNumber} of ${structure.totalWeeks} — apply progressive overload appropriate for this week's position.`,
    'Return ONLY the JSON object.'
  );
  return lines.join('\n');
}

// ── Template-based generation helpers ──

interface AiCustomization {
  programName: string;
  programDescription: string;
  goalSummary: string;
  exerciseSwaps?: Array<{ templateName: string; oldExercise: string; newExercise: string }>;
  workoutNotes?: Array<{ templateName: string; coachNote: string }>;
}

const TRAINING_DAYS: Record<number, string[]> = {
  1: ['Wednesday'],
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  5: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  7: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

function formatPreferredSplit(split: string | undefined): string {
  switch (split) {
    case 'push_pull_legs':
      return 'Push/Pull/Legs';
    case 'upper_lower':
      return 'Upper/Lower';
    case 'full_body':
      return 'Full Body';
    case 'body_part':
      return 'Body Part Split';
    case 'athlete':
      return 'Coach Selected';
    default:
      return 'Auto';
  }
}

function resolveProgramStructure(profile: OnboardingData): { templateNames: string[]; splitName: string } {
  const days = Math.min(Math.max(profile.daysPerWeek, 1), 7);

  switch (profile.preferredSplit) {
    case 'push_pull_legs': {
      if (days >= 5) {
        return {
          templateNames: ['Push Day', 'Pull Day', 'Leg Day', 'Push Day', 'Pull Day'].slice(0, days),
          splitName: 'Push/Pull/Legs',
        };
      }
      if (days === 4) {
        return {
          templateNames: ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body'],
          splitName: 'Push/Pull/Legs',
        };
      }
      if (days === 3) {
        return {
          templateNames: ['Push Day', 'Pull Day', 'Leg Day'],
          splitName: 'Push/Pull/Legs',
        };
      }
      if (days === 2) {
        return {
          templateNames: ['Push Day', 'Pull Day'],
          splitName: 'Push/Pull',
        };
      }
      return { templateNames: ['Push Day'], splitName: 'Push Day' };
    }
    case 'upper_lower': {
      return {
        templateNames: Array.from({ length: days }, (_, idx) => (idx % 2 === 0 ? 'Upper Body' : 'Leg Day')),
        splitName: 'Upper/Lower',
      };
    }
    case 'full_body': {
      return {
        templateNames: Array.from({ length: days }, (_, idx) => (idx % 2 === 0 ? 'Full Body A' : 'Full Body B')),
        splitName: 'Full Body',
      };
    }
    case 'body_part': {
      const bodyPartTemplates = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Push Day', 'Pull Day', 'Leg Day'];
      return {
        templateNames: bodyPartTemplates.slice(0, days),
        splitName: 'Body Part Split',
      };
    }
    case 'athlete':
    default: {
      if (days <= 3) {
        return {
          templateNames: ['Full Body A', 'Full Body B', 'Full Body A'].slice(0, days),
          splitName: 'Full Body',
        };
      }
      if (days === 4) {
        return {
          templateNames: ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body'],
          splitName: 'PPL + Upper',
        };
      }
      return {
        templateNames: ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Full Body A', 'Push Day', 'Pull Day'].slice(0, days),
        splitName: 'Push/Pull/Legs',
      };
    }
  }
}

type TemplateRow = Awaited<ReturnType<typeof prisma.workoutTemplate.findFirst>> & {
  exercises: Array<{
    name: string;
    orderIndex: number;
    notes: string | null;
    sets: Array<{ setNumber: number; targetReps: number | null; targetWeight: number | null; unit: string }>;
  }>;
};

function templateToWorkout(
  template: NonNullable<TemplateRow>,
  weekNumber: number,
  totalWeeks: number,
  dayOfWeek: string,
  coachNote: string
): AiPlannedWorkout {
  const isDeloadWeek = totalWeeks >= 4 && weekNumber === totalWeeks;
  const repBonus = isDeloadWeek ? Math.max(totalWeeks - 2, 0) : Math.min(weekNumber - 1, 3);

  const exercises: AiPlannedExercise[] = template.exercises.map((ex) => {
    let sets: AiPlannedExerciseSet[] = ex.sets.map((s) => ({
      setNumber: s.setNumber,
      targetReps: s.targetReps !== null ? s.targetReps + repBonus : null,
      targetWeight: null,
      rpeTarget: null,
      unit: s.unit,
    }));
    // Deload week: drop to ~2/3 of sets
    if (isDeloadWeek) {
      sets = sets.slice(0, Math.max(2, Math.floor(sets.length * 0.67)));
    }
    return { name: ex.name, orderIndex: ex.orderIndex, notes: ex.notes ?? '', sets };
  });

  return {
    weekNumber,
    dayOfWeek,
    name: isDeloadWeek ? `${template.name} (Deload)` : template.name,
    focus: template.name,
    estimatedDuration: isDeloadWeek ? 40 : 65,
    warmup: [
      { name: '5 min light cardio', duration: '5 min' },
      { name: 'Dynamic mobility / activation', duration: '5 min' },
    ],
    exercises,
    conditioning: null,
    coachNotes: coachNote || (template.description ?? ''),
  };
}

function validateAiCustomization(val: unknown): val is AiCustomization {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  return typeof v.programName === 'string' && typeof v.goalSummary === 'string';
}

export async function generateProgram(
  userId: string,
  customization?: string,
  requestedWeeks?: number
): Promise<AiGeneratedProgram> {
  const [resolved, profileRow] = await Promise.all([
    resolveAi(userId),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  if (!profileRow || !profileRow.onboardingCompleted) {
    const err = new Error('Complete onboarding before generating a program.') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const profile: OnboardingData = {
    primaryGoal: profileRow.primaryGoal,
    secondaryGoals: JSON.parse(profileRow.secondaryGoals),
    experienceLevel: profileRow.experienceLevel,
    daysPerWeek: profileRow.daysPerWeek,
    sessionDurationMins: profileRow.sessionDurationMins,
    preferredSplit: profileRow.preferredSplit,
    availableEquipment: JSON.parse(profileRow.availableEquipment),
    restrictions: JSON.parse(profileRow.restrictions),
    injuryFlags: JSON.parse(profileRow.injuryFlags),
    workoutEnvironment: profileRow.workoutEnvironment,
    priorityAreas: JSON.parse(profileRow.priorityAreas),
    programStyle: profileRow.programStyle,
    benchmarkSquat: profileRow.benchmarkSquat ?? undefined,
    benchmarkDeadlift: profileRow.benchmarkDeadlift ?? undefined,
    benchmarkBench: profileRow.benchmarkBench ?? undefined,
    benchmarkPress: profileRow.benchmarkPress ?? undefined,
    benchmarkPullups: profileRow.benchmarkPullups ?? undefined,
    benchmarkMileTime: profileRow.benchmarkMileTime ?? undefined,
    bodyweight: profileRow.bodyweight ?? undefined,
    bodyFatPercent: profileRow.bodyFatPercent ?? undefined,
    unitSystem: profileRow.unitSystem,
  };

  // Load preloaded seed templates matching the user's preferred split and schedule
  const { templateNames, splitName } = resolveProgramStructure(profile);
  const rawTemplates = await prisma.workoutTemplate.findMany({
    where: { source: 'preloaded', name: { in: templateNames } },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });

  // Order templates to match templateNames sequence
  const templates = templateNames
    .map((n) => rawTemplates.find((t) => t.name === n))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  if (templates.length === 0) {
    const err = new Error('Seed templates not found. Please contact support.') as Error & { statusCode: number };
    err.statusCode = 500;
    throw err;
  }

  // ONE small AI call: program name, description, goal summary, optional swaps/notes
  const profileSummary = [
    `Goal: ${profile.primaryGoal}`,
    `Level: ${profile.experienceLevel}`,
    `Days: ${profile.daysPerWeek}/week`,
    `Duration: ${profile.sessionDurationMins} min`,
    `Preferred Split: ${formatPreferredSplit(profile.preferredSplit)}`,
    `Equipment: ${profile.availableEquipment.join(', ') || 'full gym'}`,
    `Restrictions: ${profile.restrictions.join(', ') || 'none'}`,
  ].join(', ');

  const totalWeeks = Math.min(Math.max(requestedWeeks ?? 4, 1), 16);
  const customNote = customization ? `\nCustomization request: "${customization}"` : '';

  const userPrompt = `Athlete profile: ${profileSummary}${customNote}
Requested program length: ${totalWeeks} week${totalWeeks === 1 ? '' : 's'}
Templates being used: ${templateNames.join(', ')}
Return JSON (no text outside JSON):
{
  "programName": "3-6 word name",
  "programDescription": "2-3 sentence program description",
  "goalSummary": "2-3 sentence coaching summary for this athlete",
  "exerciseSwaps": [{"templateName":"string","oldExercise":"string","newExercise":"string"}],
  "workoutNotes": [{"templateName":"string","coachNote":"string"}]
}
Only include exerciseSwaps if equipment or restrictions require it. Provide one workoutNotes entry per template.`;

  let aiCustom: AiCustomization;
  try {
    aiCustom = await callAiWithRetry<AiCustomization>(
      resolved,
      'You are a fitness program designer. Return ONLY valid JSON matching the schema. No markdown.',
      userPrompt,
      validateAiCustomization,
      900
    );
  } catch {
    aiCustom = {
      programName: `${profile.daysPerWeek}-Day ${profile.primaryGoal} Program`,
      programDescription: `A ${profile.daysPerWeek}-day per week program tailored to your ${profile.primaryGoal} goals with proven evidence-based templates.`,
      goalSummary: `This program is designed for a ${profile.experienceLevel} athlete focused on ${profile.primaryGoal}. Training ${profile.daysPerWeek} days per week with sessions around ${profile.sessionDurationMins} minutes.`,
    };
  }

  // Build swap + note lookup maps
  const swapMap = new Map<string, Map<string, string>>();
  for (const swap of aiCustom.exerciseSwaps ?? []) {
    if (!swapMap.has(swap.templateName)) swapMap.set(swap.templateName, new Map());
    swapMap.get(swap.templateName)!.set(swap.oldExercise, swap.newExercise);
  }
  const noteMap = new Map<string, string>();
  for (const note of aiCustom.workoutNotes ?? []) {
    noteMap.set(note.templateName, note.coachNote);
  }

  // Build schedule for the requested program length
  const trainingDays = TRAINING_DAYS[Math.min(profile.daysPerWeek, 7)] ?? TRAINING_DAYS[3];
  const workouts: AiPlannedWorkout[] = [];

  for (let week = 1; week <= totalWeeks; week++) {
    trainingDays.forEach((day, dayIdx) => {
      const template = templates[dayIdx % templates.length];
      const swaps = swapMap.get(template.name);
      const modifiedTemplate = swaps
        ? { ...template, exercises: template.exercises.map((ex) => ({ ...ex, name: swaps.get(ex.name) ?? ex.name })) }
        : template;
      workouts.push(
        templateToWorkout(
          modifiedTemplate,
          week,
          totalWeeks,
          day,
          noteMap.get(template.name) ?? ''
        )
      );
    });
  }

  const progressionRules =
    totalWeeks >= 4
      ? {
          mainLifts: `Add 1 rep per set through week ${Math.max(totalWeeks - 1, 1)}; week ${totalWeeks} is a deload with reduced volume.`,
          accessories: 'Maintain weight, focus on form and full range of motion.',
          conditioning: 'Keep effort moderate and prioritize recovery on the final week.',
        }
      : {
          mainLifts: `Add 1 rep per set each week through week ${totalWeeks}.`,
          accessories: 'Maintain weight, focus on form and full range of motion.',
          conditioning: 'Keep conditioning easy enough that strength work stays the priority.',
        };

  return {
    programName: aiCustom.programName,
    programDescription: aiCustom.programDescription,
    totalWeeks,
    weeklyStructure: { split: splitName, days: trainingDays },
    progressionRules,
    aiGoalSummary: aiCustom.goalSummary,
    workouts,
  };
}

// ─────────────────────────────────────────────
// 3. Post-workout AI summary
// ─────────────────────────────────────────────

interface SessionSummaryInput {
  sessionName: string;
  plannedExercises?: unknown;
  completedSets: Array<{
    exerciseName: string;
    setNumber: number;
    actualReps: number | null;
    actualWeight: number | null;
    rpe: number | null;
    unit: string;
  }>;
  preEnergyLevel?: number;
  postEnergyLevel?: number;
  sorenessLevel?: number;
  durationMinutes?: number;
  notes?: string;
}

interface WorkoutSummaryOutput {
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

function validateSummaryOutput(val: unknown): val is WorkoutSummaryOutput {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  return typeof v.completionScore === 'number' && typeof v.performanceScore === 'number';
}

export async function generateWorkoutSummary(userId: string, input: SessionSummaryInput): Promise<WorkoutSummaryOutput> {
  const resolved = await resolveAi(userId);

  const systemPrompt = `You are an expert strength and conditioning coach reviewing a completed workout. Analyze the session data and provide honest, specific feedback.

Return ONLY valid JSON matching this schema — no text outside the JSON:
{
  "completionScore": 85,
  "performanceScore": 80,
  "sessionRating": "Good",
  "highlights": ["string"],
  "struggles": ["string"],
  "fatigueReading": "moderate",
  "progressionRecommendation": "string",
  "nextSessionCue": "string — one specific technical or effort cue for next time",
  "summaryText": "string — 2-3 sentences summarizing the session honestly"
}

sessionRating must be one of: Excellent, Good, Acceptable, Off Day
fatigueReading must be one of: low, moderate, high, very_high
completionScore = 0-100 based on sets/exercises completed vs planned
performanceScore = 0-100 based on rep quality, weight vs expected, RPE alignment`;

  const setsByExercise = input.completedSets.reduce<Record<string, typeof input.completedSets>>((acc, s) => {
    if (!acc[s.exerciseName]) acc[s.exerciseName] = [];
    acc[s.exerciseName].push(s);
    return acc;
  }, {});

  const exerciseSummary = Object.entries(setsByExercise).map(([name, sets]) => {
    const setLines = sets.map((s) =>
      `Set ${s.setNumber}: ${s.actualReps ?? '?'} reps @ ${s.actualWeight ?? 'BW'} ${s.unit}${s.rpe ? ` RPE ${s.rpe}` : ''}`
    );
    return `${name}:\n  ${setLines.join('\n  ')}`;
  }).join('\n');

  const userPrompt = [
    `Session: ${input.sessionName}`,
    input.durationMinutes ? `Duration: ${input.durationMinutes} minutes` : '',
    input.preEnergyLevel ? `Pre-workout energy: ${input.preEnergyLevel}/10` : '',
    input.postEnergyLevel ? `Post-workout energy: ${input.postEnergyLevel}/10` : '',
    input.sorenessLevel ? `Soreness going in: ${input.sorenessLevel}/10` : '',
    '',
    'Completed sets:',
    exerciseSummary,
    input.notes ? `\nAthlete notes: ${input.notes}` : '',
    '\nReturn ONLY the JSON object.',
  ].filter(Boolean).join('\n');

  return callAiWithRetry<WorkoutSummaryOutput>(
    resolved,
    systemPrompt,
    userPrompt,
    validateSummaryOutput,
    2000
  );
}

// ─────────────────────────────────────────────
// 4. Weekly analysis + program adjustment
// ─────────────────────────────────────────────

interface WeeklyAnalysisInput {
  program: { name: string; aiGoalSummary: string | null };
  plannedWorkouts: Array<{ id: string; name: string; exercises: unknown; isCompleted: boolean }>;
  completedSessions: Array<{
    id: string;
    completedAt: Date | null;
    completionScore: number | null;
    performanceScore: number | null;
    preEnergyLevel: number | null;
    postEnergyLevel: number | null;
    sorenessLevel: number | null;
    aiSummary: string | null;
    sets: Array<{
      exerciseName: string;
      setNumber: number;
      actualReps: number | null;
      actualWeight: number | null;
      rpe: number | null;
      unit: string;
    }>;
  }>;
  weekNumber: number;
}

interface WeeklyAnalysisOutput {
  adherenceScore: number;
  fatigueLevel: number;
  progressionNotes: string;
  adjustments: Array<{
    exerciseName: string;
    adjustmentType: string;
    detail: string;
  }>;
  recommendations: string[];
  weekSummary: string;
}

function validateWeeklyAnalysis(val: unknown): val is WeeklyAnalysisOutput {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  return typeof v.adherenceScore === 'number' && typeof v.weekSummary === 'string';
}

export async function generateWeeklyAnalysis(userId: string, input: WeeklyAnalysisInput): Promise<WeeklyAnalysisOutput> {
  const resolved = await resolveAi(userId);

  const systemPrompt = `You are an expert periodization coach reviewing a training week. Assess what happened and recommend specific adjustments for next week.

Return ONLY valid JSON matching this schema:
{
  "adherenceScore": 85,
  "fatigueLevel": 6,
  "progressionNotes": "string",
  "adjustments": [
    {
      "exerciseName": "string",
      "adjustmentType": "increase_weight | decrease_weight | increase_volume | decrease_volume | swap_exercise | maintain",
      "detail": "string"
    }
  ],
  "recommendations": ["string"],
  "weekSummary": "string — 2-3 honest sentences about the week"
}

adherenceScore = 0-100 (percentage of planned workouts completed)
fatigueLevel = 1-10 (1=fresh, 10=very fatigued)`;

  const completedCount = input.plannedWorkouts.filter((pw) => pw.isCompleted).length;
  const totalPlanned = input.plannedWorkouts.length;

  const sessionDetails = input.completedSessions.map((s) => {
    const summary = s.aiSummary ? JSON.parse(s.aiSummary) : null;
    return [
      `Session on ${s.completedAt?.toDateString() ?? 'unknown date'}:`,
      `  Completion: ${s.completionScore ?? '?'}/100, Performance: ${s.performanceScore ?? '?'}/100`,
      `  Pre-energy: ${s.preEnergyLevel ?? '?'}/10, Post-energy: ${s.postEnergyLevel ?? '?'}/10, Soreness: ${s.sorenessLevel ?? '?'}/10`,
      summary ? `  AI summary: ${summary.summaryText}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const userPrompt = [
    `Program: ${input.program.name}`,
    `Goal: ${input.program.aiGoalSummary ?? 'General fitness'}`,
    `Week ${input.weekNumber} review:`,
    `Completed ${completedCount} of ${totalPlanned} planned workouts`,
    '',
    'Session details:',
    sessionDetails || 'No completed sessions this week.',
    '',
    'Return ONLY the JSON object.',
  ].join('\n');

  return callAiWithRetry<WeeklyAnalysisOutput>(
    resolved,
    systemPrompt,
    userPrompt,
    validateWeeklyAnalysis,
    4000
  );
}
