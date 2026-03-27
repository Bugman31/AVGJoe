import Anthropic from '@anthropic-ai/sdk';
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

interface AiWorkoutPlan {
  name: string;
  description: string;
  exercises: AiExercise[];
}

function buildSystemPrompt(): string {
  return `You are an expert certified personal trainer with deep knowledge of exercise science, programming, and periodization. Your role is to create safe, effective, and personalized workout programs.

When creating workouts:
- Always prioritize proper form and injury prevention
- Scale intensity to the user's fitness level
- Include appropriate warm-up considerations in exercise notes
- Use evidence-based rep/set schemes
- Provide clear, actionable notes for each exercise

You must ALWAYS respond with valid JSON matching this exact schema:
{
  "name": "string",
  "description": "string",
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

Do not include any text outside the JSON object. Do not use markdown code blocks.`;
}

function buildUserPrompt(data: GenerateWorkoutData): string {
  const parts = [`Create a workout program for the following goal: ${data.goal}`];

  if (data.fitnessLevel) {
    parts.push(`Fitness level: ${data.fitnessLevel}`);
  }
  if (data.daysPerWeek) {
    parts.push(`Days per week available: ${data.daysPerWeek}`);
  }
  if (data.equipment) {
    parts.push(`Available equipment: ${data.equipment}`);
  }

  parts.push(
    'Return ONLY a valid JSON object with the workout plan. No markdown, no explanation, just the JSON.'
  );

  return parts.join('\n');
}

function parseWorkoutJson(text: string): AiWorkoutPlan {
  // Strip markdown code blocks if present
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(stripped) as AiWorkoutPlan;
}

function validateWorkoutPlan(plan: unknown): plan is AiWorkoutPlan {
  if (typeof plan !== 'object' || plan === null) return false;
  const p = plan as Record<string, unknown>;
  if (typeof p.name !== 'string') return false;
  if (typeof p.description !== 'string') return false;
  if (!Array.isArray(p.exercises)) return false;
  return true;
}

export async function generateWorkout(userId: string, data: GenerateWorkoutData) {
  // Resolve API key: user key takes priority, fall back to env
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

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(data);

  // First attempt
  let responseText: string;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }
    responseText = block.text;
  } catch (err) {
    if ((err as Error & { statusCode?: number }).statusCode === 400) throw err;
    throw new Error(`AI generation failed: ${(err as Error).message}`);
  }

  // Try to parse, retry once with correction if parse fails
  let plan: AiWorkoutPlan;
  try {
    const parsed = parseWorkoutJson(responseText);
    if (!validateWorkoutPlan(parsed)) {
      throw new Error('Invalid workout plan structure');
    }
    plan = parsed;
  } catch {
    // Retry with correction prompt
    const correctionMessage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: responseText },
        {
          role: 'user',
          content:
            'Your previous response was not valid JSON. Please respond with ONLY the JSON object, no markdown formatting, no code blocks, no extra text.',
        },
      ],
    });

    const retryBlock = correctionMessage.content[0];
    if (retryBlock.type !== 'text') {
      throw new Error('Invalid response from AI on retry');
    }

    try {
      const retryParsed = parseWorkoutJson(retryBlock.text);
      if (!validateWorkoutPlan(retryParsed)) {
        throw new Error('Invalid workout plan structure after retry');
      }
      plan = retryParsed;
    } catch {
      const parseErr = new Error(
        'Failed to parse AI-generated workout plan. Please try again.'
      ) as Error & { statusCode: number };
      parseErr.statusCode = 422;
      throw parseErr;
    }
  }

  // Persist the generated template
  const template = await createTemplate(userId, {
    name: plan.name,
    description: plan.description,
    isAiGenerated: true,
    aiGoal: data.goal,
    exercises: plan.exercises.map((ex) => ({
      name: ex.name,
      orderIndex: ex.orderIndex,
      notes: ex.notes,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps ?? undefined,
        targetWeight: s.targetWeight ?? undefined,
        unit: s.unit ?? 'kg',
      })),
    })),
  });

  return template;
}
