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
- Vary the movements across days (push/pull/legs, upper/lower, or full-body splits)

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
  const parts = [`Create a complete multi-week workout program for: ${data.goal}`];
  if (data.fitnessLevel) parts.push(`Fitness level: ${data.fitnessLevel}`);
  if (data.daysPerWeek) parts.push(`Training days per week: ${data.daysPerWeek}`);
  if (data.equipment) parts.push(`Available equipment: ${data.equipment}`);
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

function buildProgramSystemPrompt(): string {
  return `You are an expert certified strength and conditioning coach. Create a personalized multi-week training program based on detailed user profile data.

Program requirements:
- Design a structured program matching the user's goals, experience, equipment, and schedule
- Include appropriate weekly splits (e.g., Upper/Lower, PPL, Full Body)
- Progressive overload built in week-over-week
- RPE targets (e.g., "7-8") on main lifts — not absolute weights (user will calibrate)
- Include warmup movements for each session
- Add conditioning blocks when relevant to the user's goals
- Respect all restrictions and injury flags
- Use only equipment the user has available
- Each workout should include honest coaching notes about the session's purpose

Output ONLY valid JSON matching this exact schema:
{
  "programName": "string",
  "programDescription": "string",
  "totalWeeks": 4,
  "weeklyStructure": { "split": "string", "days": ["Monday", "Wednesday", "Friday"] },
  "progressionRules": { "mainLifts": "string", "accessories": "string", "conditioning": "string" },
  "aiGoalSummary": "string — 2-3 sentence coaching profile summary for the user",
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

function buildProgramUserPrompt(profile: OnboardingData): string {
  const lines: string[] = [
    'Create a personalized training program for this athlete:',
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

function validateGeneratedProgram(plan: unknown): plan is AiGeneratedProgram {
  if (typeof plan !== 'object' || plan === null) return false;
  const p = plan as Record<string, unknown>;
  if (typeof p.programName !== 'string') return false;
  if (!Array.isArray(p.workouts) || p.workouts.length === 0) return false;
  return true;
}

export async function generateProgram(userId: string) {
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

  const result = await callAiWithRetry<AiGeneratedProgram>(
    resolved,
    buildProgramSystemPrompt(),
    buildProgramUserPrompt(profile),
    validateGeneratedProgram,
    16000
  );

  return result;
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
