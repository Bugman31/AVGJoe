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

// ── Step 1 schema: program skeleton ──

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

function formatPreferredSplit(split: string | undefined): string {
  switch (split) {
    case 'push_pull_legs': return 'Push/Pull/Legs';
    case 'upper_lower': return 'Upper/Lower';
    case 'full_body': return 'Full Body';
    case 'body_part': return 'Body Part Split';
    case 'athlete': return 'Coach Selected';
    default: return split ?? 'Auto';
  }
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

function buildStructureUserPrompt(profile: OnboardingData, customization?: string, requestedWeeks?: number): string {
  const unit = profile.unitSystem;
  const lines: string[] = [
    'Design the training program structure for this athlete:',
    '',
    `Primary Goal: ${profile.primaryGoal}`,
    `Secondary Goals: ${profile.secondaryGoals.join(', ') || 'none'}`,
    `Experience Level: ${profile.experienceLevel}`,
    `Training Days Per Week: ${profile.daysPerWeek}`,
    `Session Duration: ${profile.sessionDurationMins} minutes`,
    `Preferred Split: ${formatPreferredSplit(profile.preferredSplit)}`,
    `Available Equipment: ${profile.availableEquipment.join(', ') || 'bodyweight only'}`,
    `Workout Environment: ${profile.workoutEnvironment}`,
    `Movement Restrictions: ${profile.restrictions.join(', ') || 'none'}`,
    `Injury Flags: ${profile.injuryFlags.join(', ') || 'none'}`,
    `Priority Areas: ${profile.priorityAreas.join(', ') || 'general'}`,
    `Program Style: ${profile.programStyle}`,
    `Unit System: ${unit}`,
  ];

  if (profile.bodyweight) lines.push(`Bodyweight: ${profile.bodyweight} ${unit}`);

  const hasBenchmarks = profile.benchmarkBench || profile.benchmarkSquat || profile.benchmarkDeadlift || profile.benchmarkPress || profile.benchmarkPullups;
  if (hasBenchmarks) {
    lines.push('', 'Strength Benchmarks:');
    if (profile.benchmarkBench) lines.push(`  Bench Press 1RM: ${profile.benchmarkBench} ${unit}`);
    if (profile.benchmarkSquat) lines.push(`  Squat 1RM: ${profile.benchmarkSquat} ${unit}`);
    if (profile.benchmarkDeadlift) lines.push(`  Deadlift 1RM: ${profile.benchmarkDeadlift} ${unit}`);
    if (profile.benchmarkPress) lines.push(`  Overhead Press 1RM: ${profile.benchmarkPress} ${unit}`);
    if (profile.benchmarkPullups) lines.push(`  Pull-Up Max Reps: ${profile.benchmarkPullups} reps`);
  }

  if (requestedWeeks) lines.push('', `Requested Program Length: ${requestedWeeks} weeks`);
  if (customization) lines.push('', `Athlete Notes / Customization: "${customization}"`);

  lines.push('', 'Return ONLY the JSON object — no markdown, no explanation.');
  return lines.join('\n');
}

function buildWeekSystemPrompt(): string {
  return `You are an expert certified strength and conditioning coach. Generate the complete workouts for a specific week of a training program.

IMPORTANT — target weights:
- Set targetWeight for every exercise where a barbell, dumbbell, or machine is involved
- Main compound lifts (squat, bench press, deadlift, overhead press, barbell row): use 65-85% of the athlete's provided 1RM
- Accessory exercises (dumbbell curls, tricep pushdowns, lateral raises, etc.): estimate a realistic working weight based on the athlete's overall strength level
- Bodyweight exercises (pull-ups, dips, push-ups, lunges): set targetWeight to null
- Use the athlete's unit system (lbs or kg) consistently for every set
- Apply progressive overload between weeks as described in the progression rules

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
              "targetWeight": 135,
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
  weekNumber: number,
  totalWeeks: number,
  customization?: string
): string {
  const unit = profile.unitSystem;
  const lines = [
    `Generate workouts for WEEK ${weekNumber} of ${totalWeeks} of the "${structure.programName}" program.`,
    '',
    '── Program structure ──',
    `Split: ${structure.weeklyStructure.split}`,
    `Training days this week: ${structure.weeklyStructure.days.join(', ')}`,
    `Main lift progression: ${structure.progressionRules.mainLifts}`,
    `Accessory progression: ${structure.progressionRules.accessories}`,
    '',
    '── Athlete profile ──',
    `Primary Goal: ${profile.primaryGoal}`,
    `Experience Level: ${profile.experienceLevel}`,
    `Session Duration: ${profile.sessionDurationMins} minutes`,
    `Available Equipment: ${profile.availableEquipment.join(', ') || 'bodyweight only'}`,
    `Restrictions: ${profile.restrictions.join(', ') || 'none'}`,
    `Unit System: ${unit}`,
  ];

  if (profile.bodyweight) lines.push(`Bodyweight: ${profile.bodyweight} ${unit}`);

  const hasBenchmarks = profile.benchmarkBench || profile.benchmarkSquat || profile.benchmarkDeadlift || profile.benchmarkPress || profile.benchmarkPullups;
  if (hasBenchmarks) {
    lines.push('', '── Strength benchmarks — use these to set targetWeight ──');
    if (profile.benchmarkBench) {
      lines.push(`Bench Press 1RM: ${profile.benchmarkBench} ${unit}  →  working range ${Math.round(profile.benchmarkBench * 0.70)}–${Math.round(profile.benchmarkBench * 0.82)} ${unit}`);
    }
    if (profile.benchmarkSquat) {
      lines.push(`Squat 1RM: ${profile.benchmarkSquat} ${unit}  →  working range ${Math.round(profile.benchmarkSquat * 0.70)}–${Math.round(profile.benchmarkSquat * 0.82)} ${unit}`);
    }
    if (profile.benchmarkDeadlift) {
      lines.push(`Deadlift 1RM: ${profile.benchmarkDeadlift} ${unit}  →  working range ${Math.round(profile.benchmarkDeadlift * 0.70)}–${Math.round(profile.benchmarkDeadlift * 0.82)} ${unit}`);
    }
    if (profile.benchmarkPress) {
      lines.push(`Overhead Press 1RM: ${profile.benchmarkPress} ${unit}  →  working range ${Math.round(profile.benchmarkPress * 0.70)}–${Math.round(profile.benchmarkPress * 0.82)} ${unit}`);
    }
    if (profile.benchmarkPullups) {
      lines.push(`Pull-Up Max Reps: ${profile.benchmarkPullups} reps (set targetWeight to null; use rep count to gauge difficulty)`);
    }
  } else {
    lines.push('', 'No strength benchmarks provided — estimate appropriate working weights based on the athlete\'s experience level.');
  }

  const isDeload = totalWeeks >= 4 && weekNumber === totalWeeks;
  if (isDeload) {
    lines.push('', `Week ${weekNumber} is the DELOAD week. Reduce volume by ~30% and drop intensity to ~60% of 1RM. Fewer sets, lighter weights, same movements.`);
  } else {
    lines.push('', `Apply progressive overload for week ${weekNumber} of ${totalWeeks}. Each week should be slightly harder than the previous — more weight, more reps, or one extra set on a key lift.`);
  }

  if (customization) lines.push('', `Athlete notes: "${customization}"`);
  lines.push('', 'Return ONLY the JSON object.');
  return lines.join('\n');
}

function validateAiProgramStructure(val: unknown): val is AiProgramStructure {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  if (typeof v.programName !== 'string') return false;
  if (typeof v.totalWeeks !== 'number') return false;
  const ws = v.weeklyStructure as Record<string, unknown>;
  if (!ws || !Array.isArray(ws.days) || ws.days.length === 0) return false;
  return true;
}

function validateWeekWorkouts(val: unknown): val is AiWeekWorkouts {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  if (typeof v.weekNumber !== 'number') return false;
  if (!Array.isArray(v.workouts) || v.workouts.length === 0) return false;
  return true;
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

  // Step 1: Generate program structure (name, split, training days, progression rules)
  const structure = await callAiWithRetry<AiProgramStructure>(
    resolved,
    buildStructureSystemPrompt(),
    buildStructureUserPrompt(profile, customization, requestedWeeks),
    validateAiProgramStructure,
    1500
  );

  const totalWeeks = Math.min(Math.max(requestedWeeks ?? structure.totalWeeks ?? 4, 1), 16);

  // Step 2: Generate each week's full workouts in parallel (exercises + sets + reps + weights)
  const weekResults = await Promise.all(
    Array.from({ length: totalWeeks }, (_, i) => i + 1).map((weekNumber) =>
      callAiWithRetry<AiWeekWorkouts>(
        resolved,
        buildWeekSystemPrompt(),
        buildWeekUserPrompt(profile, structure, weekNumber, totalWeeks, customization),
        validateWeekWorkouts,
        4000
      )
    )
  );

  const workouts = weekResults.flatMap((w) => w.workouts);

  return {
    programName: structure.programName,
    programDescription: structure.programDescription,
    totalWeeks,
    weeklyStructure: structure.weeklyStructure,
    progressionRules: structure.progressionRules,
    aiGoalSummary: structure.aiGoalSummary,
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

// ─────────────────────────────────────────────
// 5. In-workout coach chat
// ─────────────────────────────────────────────

export interface CoachChatInput {
  sessionId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  liveMetrics?: {
    status: 'unsupported' | 'waiting' | 'live' | 'stale' | 'error';
    heartRate?: number | null;
    activeEnergyBurned?: number | null;
    heartRateTrend?: 'rising' | 'steady' | 'falling' | 'unknown';
    lastHeartRateSampleAt?: string | null;
    lastEnergySampleAt?: string | null;
    lastUpdatedAt?: string | null;
    errorMessage?: string | null;
  };
}

interface CoachChatPlannedExercise {
  name?: string;
  sets?: Array<{
    setNumber?: number;
    targetReps?: number | null;
  }>;
}

function summarizeSessionVolume(
  sets: Array<{ actualWeight?: number | null; actualReps?: number | null }>
) {
  return sets.reduce(
    (sum, set) => sum + (set.actualWeight ?? 0) * (set.actualReps ?? 0),
    0
  );
}

function summarizeAverageRpe(sets: Array<{ rpe?: number | null }>) {
  const rpes = sets.filter((set) => set.rpe != null).map((set) => set.rpe!);
  if (rpes.length === 0) return 'N/A';
  return (rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length).toFixed(1);
}

function parsePlannedExercises(raw: string | null | undefined): CoachChatPlannedExercise[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildLiveMetricsSummary(
  liveMetrics: CoachChatInput['liveMetrics'],
): { summary: string; coachingCue: string } {
  if (!liveMetrics) {
    return {
      summary: 'No live Apple Health or Apple Watch metrics were provided.',
      coachingCue: 'Do not reference live recovery data unless the user brings it up.',
    };
  }

  const hrText = liveMetrics.heartRate != null ? `${Math.round(liveMetrics.heartRate)} bpm` : 'unknown HR';
  const kcalText = liveMetrics.activeEnergyBurned != null
    ? `${Math.round(liveMetrics.activeEnergyBurned)} kcal active energy`
    : 'unknown active energy';
  const freshness = liveMetrics.lastUpdatedAt ?? liveMetrics.lastHeartRateSampleAt ?? liveMetrics.lastEnergySampleAt;

  switch (liveMetrics.status) {
    case 'live': {
      const trend = liveMetrics.heartRateTrend ?? 'unknown';
      const cue =
        liveMetrics.heartRate != null && liveMetrics.heartRate >= 150 && trend === 'rising'
          ? 'Recovery looks taxed right now. Bias toward more rest or holding load unless the set data clearly says otherwise.'
          : liveMetrics.heartRate != null && liveMetrics.heartRate <= 115 && trend === 'falling'
          ? 'Recovery looks solid right now. If the set and RPE data also look good, it is reasonable to encourage continuing or a small load increase.'
          : 'Recovery looks mixed. Use the live metrics as one more signal alongside RPE, rep quality, and rep drop-off.';
      return {
        summary: `Live Apple Health metrics are available: HR ${hrText}, ${kcalText}, trend ${trend}, last update ${freshness ?? 'unknown'}.`,
        coachingCue: cue,
      };
    }
    case 'stale':
      return {
        summary: `Apple Health metrics are stale: latest HR ${hrText}, ${kcalText}, last update ${freshness ?? 'unknown'}.`,
        coachingCue: 'You may mention that the recovery signal is delayed and should be treated cautiously.',
      };
    case 'waiting':
      return {
        summary: 'Apple Health is connected but no fresh live samples have arrived yet.',
        coachingCue: 'Do not invent live recovery insights. Use the workout log only until data arrives.',
      };
    case 'error':
      return {
        summary: `Apple Health live metrics failed to load${liveMetrics.errorMessage ? `: ${liveMetrics.errorMessage}` : '.'}`,
        coachingCue: 'Acknowledge that live data is unavailable if relevant, then coach from the workout log.',
      };
    case 'unsupported':
    default:
      return {
        summary: 'Apple Health live metrics are unavailable on this device or build.',
        coachingCue: 'Do not imply any live watch data is available.',
      };
  }
}

export async function generateCoachChat(input: CoachChatInput): Promise<string> {
  const { getSession } = await import('./session.service');
  const [resolved, session, profile, previousSessions] = await Promise.all([
    resolveAi(input.userId),
    getSession(input.sessionId, input.userId),
    prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: { primaryGoal: true },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: input.userId,
        id: { not: input.sessionId },
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 2,
      select: {
        name: true,
        completedAt: true,
        preEnergyLevel: true,
        postEnergyLevel: true,
        sorenessLevel: true,
        sets: {
          select: {
            exerciseName: true,
            actualReps: true,
            actualWeight: true,
            rpe: true,
            unit: true,
          },
        },
      },
    }),
  ]);
  const plannedWorkout = session.plannedWorkoutId
    ? await prisma.plannedWorkout.findUnique({
        where: { id: session.plannedWorkoutId },
        select: { exercises: true },
      })
    : null;

  // Build exercise summary from logged sets
  const setsByExercise = new Map<string, { totalSets: number; weights: number[]; rpes: number[] }>();
  for (const s of session.sets) {
    const entry = setsByExercise.get(s.exerciseName) ?? { totalSets: 0, weights: [], rpes: [] };
    entry.totalSets += 1;
    if (s.actualWeight != null) entry.weights.push(s.actualWeight);
    if (s.rpe != null) entry.rpes.push(s.rpe);
    setsByExercise.set(s.exerciseName, entry);
  }

  const exerciseSummary = [...setsByExercise.entries()].map(([name, data]) => {
    const avgWeight = data.weights.length
      ? Math.round(data.weights.reduce((a, b) => a + b, 0) / data.weights.length)
      : null;
    const avgRpe = data.rpes.length
      ? (data.rpes.reduce((a, b) => a + b, 0) / data.rpes.length).toFixed(1)
      : null;
    return `${name}: ${data.totalSets} set${data.totalSets !== 1 ? 's' : ''}${avgWeight != null ? `, avg ${avgWeight} lbs` : ''}${avgRpe != null ? `, avg RPE ${avgRpe}` : ''}`;
  }).join('\n') || 'No sets logged yet.';

  const totalVolume = summarizeSessionVolume(session.sets);
  const allRpes = session.sets.filter((s) => s.rpe != null).map((s) => s.rpe!);
  const avgRpe = summarizeAverageRpe(session.sets);
  const durationMins = Math.round((Date.now() - session.startedAt.getTime()) / 60000);
  const latestSet = [...session.sets]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .at(-1);
  const currentExercise = latestSet?.exerciseName ?? 'Unknown';
  const currentExerciseSets = session.sets
    .filter((set) => set.exerciseName === currentExercise)
    .sort((a, b) => a.setNumber - b.setNumber);
  const currentExerciseHistory = currentExerciseSets.length > 0
    ? currentExerciseSets
        .map((set) => {
          const weight = set.actualWeight != null ? `${set.actualWeight} ${set.unit}` : 'BW';
          const reps = set.actualReps ?? '?';
          const rpe = set.rpe != null ? `, RPE ${set.rpe}` : '';
          return `Set ${set.setNumber}: ${reps} reps @ ${weight}${rpe}`;
        })
        .join(' | ')
    : 'No sets logged for the current exercise yet.';
  const highRpeCount = allRpes.filter((rpe) => rpe >= 9).length;

  const plannedExercises = parsePlannedExercises(plannedWorkout?.exercises);
  const targetRepsByExercise = new Map<string, Map<number, number>>();
  plannedExercises.forEach((exercise) => {
    if (!exercise?.name || !Array.isArray(exercise.sets)) return;
    const setMap = new Map<number, number>();
    exercise.sets.forEach((set) => {
      if (typeof set?.setNumber === 'number' && typeof set?.targetReps === 'number') {
        setMap.set(set.setNumber, set.targetReps);
      }
    });
    targetRepsByExercise.set(exercise.name, setMap);
  });

  const missedRepSignals = session.sets
    .map((set) => {
      const targetReps = targetRepsByExercise.get(set.exerciseName)?.get(set.setNumber);
      if (targetReps == null || set.actualReps == null || set.actualReps >= targetReps) return null;
      return `${set.exerciseName} set ${set.setNumber}: target ${targetReps}, got ${set.actualReps}`;
    })
    .filter((signal): signal is string => signal != null)
    .slice(0, 3);

  const repDropSignals = [...setsByExercise.keys()]
    .map((exerciseName) => {
      const sets = session.sets
        .filter((set) => set.exerciseName === exerciseName && set.actualReps != null)
        .sort((a, b) => a.setNumber - b.setNumber);
      if (sets.length < 2) return null;

      for (let i = 1; i < sets.length; i += 1) {
        const prev = sets[i - 1];
        const next = sets[i];
        if (prev.actualReps != null && next.actualReps != null && next.actualReps < prev.actualReps) {
          return `${exerciseName}: reps dropped ${prev.actualReps}→${next.actualReps}${next.rpe != null ? ` by RPE ${next.rpe}` : ''}`;
        }
      }
      return null;
    })
    .filter((signal): signal is string => signal != null)
    .slice(0, 2);

  const previousWorkoutSummary = previousSessions.length > 0
    ? previousSessions
        .map((previousSession) => {
          const sessionVolume = summarizeSessionVolume(previousSession.sets);
          const sessionAvgRpe = summarizeAverageRpe(previousSession.sets);
          const fatigueBits = [
            previousSession.preEnergyLevel != null ? `pre-energy ${previousSession.preEnergyLevel}/10` : null,
            previousSession.postEnergyLevel != null ? `post-energy ${previousSession.postEnergyLevel}/10` : null,
            previousSession.sorenessLevel != null ? `soreness ${previousSession.sorenessLevel}/10` : null,
          ].filter(Boolean).join(', ');

          return [
            `${previousSession.name} (${previousSession.completedAt?.toISOString().slice(0, 10) ?? 'recent'})`,
            `volume ${sessionVolume.toLocaleString()} lbs`,
            `avg RPE ${sessionAvgRpe}`,
            fatigueBits || null,
          ].filter(Boolean).join(' | ');
        })
        .join('\n')
    : 'No previous completed workouts available.';

  const fatigueIndicators = [
    session.preEnergyLevel != null ? `pre-workout energy ${session.preEnergyLevel}/10` : null,
    `current avg RPE ${avgRpe}`,
    highRpeCount > 0 ? `${highRpeCount} set${highRpeCount === 1 ? '' : 's'} at RPE 9+` : null,
    previousSessions[0]?.postEnergyLevel != null
      ? `last workout post-energy ${previousSessions[0].postEnergyLevel}/10`
      : null,
    previousSessions[0]?.sorenessLevel != null
      ? `last workout soreness ${previousSessions[0].sorenessLevel}/10`
      : null,
  ].filter(Boolean).join(', ') || 'No fatigue indicators recorded yet.';

  const missedRepSummary = missedRepSignals.length > 0
    ? missedRepSignals.join(' | ')
    : repDropSignals.length > 0
    ? `No explicit target misses logged. Rep drop-off signals: ${repDropSignals.join(' | ')}`
    : 'No missed reps or rep drop-offs detected yet.';
  const userGoal = profile?.primaryGoal ?? 'general_fitness';
  const liveMetricsSummary = buildLiveMetricsSummary(input.liveMetrics);

  const systemPrompt = `You are an expert strength coach inside a workout tracking app. Answer questions about the user's CURRENT workout only. Be specific, direct, and brief (under 60 words).

Rules:
- Use the workout data below to give specific answers
- Use live Apple Health or Apple Watch metrics only when they are actually present below
- Treat live heart-rate data as a recovery signal, not a medical diagnostic
- If asked for a substitution, suggest ONE exercise that uses similar muscles
- Do not give medical advice
- Do not be generic — reference their actual numbers

User goal: ${userGoal}
Current workout: ${session.name}
Current exercise: ${currentExercise}
Current exercise set history:
${currentExerciseHistory}
Exercises completed so far:
${exerciseSummary}
Total volume: ${totalVolume} lbs
Avg RPE: ${avgRpe}
Duration: ${durationMins} min
Fatigue indicators:
${fatigueIndicators}
Missed reps / drop-off signals:
${missedRepSummary}
Live metrics:
${liveMetricsSummary.summary}
Live coaching cue:
${liveMetricsSummary.coachingCue}
Previous workouts:
${previousWorkoutSummary}`;

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...(input.conversationHistory ?? []),
    { role: 'user', content: input.message },
  ];

  const reply = await callAi(resolved, systemPrompt, messages, 200);
  return reply.trim();
}

// ─────────────────────────────────────────────
// Set feedback
// ─────────────────────────────────────────────

export interface SetFeedbackInput {
  exerciseName: string;
  setNumber: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  actualWeight: number;
  actualReps: number;
  rpe: number;
  previousSetSummary?: string;
  recommendationReason: string;
  userGoal?: string;
}

const SET_FEEDBACK_SYSTEM = `You are a strength coach inside a workout tracking app. Give short, specific feedback after a completed set.
Rules:
- Under 30 words total
- Be specific to this exact set (mention reps, weight, or RPE)
- Include the recommended next action if relevant
- No generic motivation phrases
- No medical advice
- Return only the coach message, nothing else`;

export async function generateSetFeedback(
  userId: string,
  input: SetFeedbackInput
): Promise<string> {
  const resolved = await resolveAi(userId);

  const userPrompt = `Exercise: ${input.exerciseName} | Set ${input.setNumber} of ${input.targetSets}
Target: ${input.targetRepMin}–${input.targetRepMax} reps | Actual: ${input.actualReps} reps @ ${input.actualWeight} lbs | RPE ${input.rpe}
${input.previousSetSummary ? `Previous set: ${input.previousSetSummary}` : ''}
System recommendation: ${input.recommendationReason}
User goal: ${input.userGoal ?? 'general fitness'}`;

  const raw = await callAi(resolved, SET_FEEDBACK_SYSTEM, [{ role: 'user', content: userPrompt }], 100);

  // Enforce 30-word cap server-side
  const words = raw.trim().split(/\s+/);
  return words.length <= 30 ? raw.trim() : words.slice(0, 30).join(' ');
}
