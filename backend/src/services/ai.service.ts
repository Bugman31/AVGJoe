import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { decrypt } from '../utils/crypto';
import { createTemplate } from './workout.service';

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

  if (data.fitnessLevel) {
    parts.push(`Fitness level: ${data.fitnessLevel}`);
  }
  if (data.daysPerWeek) {
    parts.push(`Training days per week: ${data.daysPerWeek}`);
  }
  if (data.equipment) {
    parts.push(`Available equipment: ${data.equipment}`);
  }

  parts.push(
    'Generate a 4-week progressive program. Return ONLY the JSON object — no markdown, no explanation.'
  );

  return parts.join('\n');
}

function parseJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(stripped);
}

function validateProgram(plan: unknown): plan is AiProgram {
  if (typeof plan !== 'object' || plan === null) return false;
  const p = plan as Record<string, unknown>;
  if (typeof p.programName !== 'string') return false;
  if (!Array.isArray(p.workouts) || p.workouts.length === 0) return false;
  return true;
}

async function callClaude(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: buildSystemPrompt(),
    messages,
  });
  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from AI');
  return block.text;
}

export async function generateWorkout(userId: string, data: GenerateWorkoutData) {
  // Resolve API key
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { anthropicApiKey: true },
  });

  let apiKey: string | undefined;
  if (user?.anthropicApiKey) {
    apiKey = decrypt(user.anthropicApiKey);
  } else if (env.ANTHROPIC_API_KEY) {
    apiKey = env.ANTHROPIC_API_KEY;
  }

  if (!apiKey) {
    const err = new Error(
      'No Anthropic API key configured. Please add your key in Profile settings.'
    ) as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const client = new Anthropic({ apiKey });
  const userPrompt = buildUserPrompt(data);
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];

  // First attempt
  let responseText: string;
  try {
    responseText = await callClaude(client, messages);
  } catch (err) {
    if ((err as Error & { statusCode?: number }).statusCode === 400) throw err;
    throw new Error(`AI generation failed: ${(err as Error).message}`);
  }

  // Parse — retry once if needed
  let program: AiProgram;
  try {
    const parsed = parseJson(responseText);
    if (!validateProgram(parsed)) throw new Error('Invalid program structure');
    program = parsed;
  } catch {
    messages.push({ role: 'assistant', content: responseText });
    messages.push({
      role: 'user',
      content: 'Your previous response was not valid JSON. Please respond with ONLY the JSON object, no markdown, no code blocks, no extra text.',
    });

    let retryText: string;
    try {
      retryText = await callClaude(client, messages);
    } catch (err) {
      throw new Error(`AI generation failed on retry: ${(err as Error).message}`);
    }

    try {
      const retryParsed = parseJson(retryText);
      if (!validateProgram(retryParsed)) throw new Error('Invalid program structure after retry');
      program = retryParsed;
    } catch {
      const parseErr = new Error(
        'Failed to parse AI-generated workout program. Please try again.'
      ) as Error & { statusCode: number };
      parseErr.statusCode = 422;
      throw parseErr;
    }
  }

  // Persist all workouts under a shared programId
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

  return {
    programId,
    programName: program.programName,
    programDescription: program.programDescription,
    totalWeeks: program.totalWeeks,
    templates,
  };
}
