import { SharedProgram } from '@/types';

const DURATION_TAGS = ['20_min', '30_min', '45_min', '60_min'] as const;
const BODY_FOCUS_TAGS = ['full_body', 'upper_body', 'lower_body', 'back_core', 'glutes_legs'] as const;

function titleize(value: string): string {
  return value
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function parseWorkoutPlan(plan: unknown): Record<string, Record<string, any>> {
  if (!plan) return {};
  if (typeof plan === 'string') {
    try {
      return JSON.parse(plan);
    } catch {
      return {};
    }
  }
  return typeof plan === 'object' ? (plan as Record<string, Record<string, any>>) : {};
}

export function getProgramDurationMinutes(program: SharedProgram): number | null {
  const durationTag = program.tags.find((tag) => DURATION_TAGS.includes(tag as (typeof DURATION_TAGS)[number]));
  if (durationTag) return parseInt(durationTag, 10);

  const plan = parseWorkoutPlan(program.workoutPlan);
  for (const week of Object.values(plan)) {
    for (const session of Object.values(week)) {
      if (typeof session?.estimatedDuration === 'number') return session.estimatedDuration;
    }
  }

  return null;
}

export function getProgramBodyFocus(program: SharedProgram): string | null {
  const tag = program.tags.find((entry) => BODY_FOCUS_TAGS.includes(entry as (typeof BODY_FOCUS_TAGS)[number]));
  return tag ? titleize(tag) : null;
}

export function getProgramHighlights(program: SharedProgram): string[] {
  const highlights: string[] = [];
  const duration = getProgramDurationMinutes(program);
  const bodyFocus = getProgramBodyFocus(program);

  if (duration) highlights.push(`${duration} min`);
  if (bodyFocus) highlights.push(bodyFocus);
  highlights.push(titleize(program.category));
  highlights.push(titleize(program.difficulty));
  highlights.push(`${program.daysPerWeek} days/week`);

  return highlights;
}

export function matchesDuration(program: SharedProgram, activeDuration: string): boolean {
  if (!activeDuration) return true;
  return program.tags.includes(activeDuration);
}

export function matchesBodyFocus(program: SharedProgram, activeBodyFocus: string): boolean {
  if (!activeBodyFocus) return true;
  return program.tags.includes(activeBodyFocus);
}

export function formatTag(tag: string): string {
  if (/^\d+_min$/.test(tag)) {
    return `${parseInt(tag, 10)} min`;
  }
  return titleize(tag);
}
