# Phase 6 — Workout Score Formula

**Status:** Not started  
**Depends on:** Phase 1 (progression engine already done — `SetRecommendation` and `logSet` already return recommendations)

---

## Goal

Replace the AI-assigned `completionScore` / `performanceScore` values with a deterministic server-side
formula so scores are consistent, fast, and not dependent on AI output. Display the composite score
and a label on the workout summary screen.

---

## Current State

### Backend
- `backend/src/services/session.service.ts` — `completeSession()` calls `generateWorkoutSummary()`
  and uses the AI-returned `completionScore` + `performanceScore`. Falls back to hardcoded `75` / `70` on timeout.
- `backend/prisma/schema.prisma` — `WorkoutSession` already has `completionScore Float?` and
  `performanceScore Float?` columns. No `workoutScore` column exists yet.
- `WorkoutSummaryOutput` in `ai.service.ts` returns `completionScore` and `performanceScore` (0–100 scale),
  plus `sessionRating: 'Excellent' | 'Good' | 'Acceptable' | 'Off Day'`.

### Frontend
- `mobile/app/(app)/workouts/[id]/summary.tsx` — displays `summary.completionScore`,
  `summary.performanceScore`, and `summary.sessionRating` from `session.aiSummary` (JSON).
- `RATING_COLORS` map: `Excellent → #22c55e`, `Good → #6366f1`, `Acceptable → #f59e0b`, `Off Day → #ef4444`.

---

## What to Build

### 1. Add `workoutScore` column to Prisma schema

**File:** `backend/prisma/schema.prisma`

Add to `WorkoutSession` model:
```prisma
workoutScore       Float?
scoreLabel         String?
```

Run `npx prisma migrate dev --name add_workout_score` from the `backend/` directory.

---

### 2. Scoring function in `session.service.ts`

**File:** `backend/src/services/session.service.ts`

Add a `computeWorkoutScore()` function called inside `completeSession()` **before** the AI summary
call. This runs synchronously on the already-loaded set data.

```
Formula (all sub-scores are 0–10):

completionScore  = (setsWithReps / totalPlannedSets) × 10
                   capped at 10, minimum 0
                   "totalPlannedSets" = session.sets count when all exercises are logged normally;
                   for MVP use total logged sets vs a target derived from the plannedWorkout if available,
                   otherwise use sets.length as both numerator and denominator → score = 10

performanceScore = (setsWhereRepsMetTarget / setsWithRepsAndTarget) × 10
                   "met target" = actualReps >= targetReps (if targetReps was stored)
                   For MVP: if no target data available, default to 7.5 (neutral)

effortScore      = average RPE quality score across logged sets:
                     rpe 6–9 → 10 points (ideal working zone)
                     rpe 5   → 7 points
                     rpe 10  → 7 points (too hard)
                     rpe < 5 or null → 5 points
                   If no RPE data → default to 7

restScore        = 7 (neutral default for MVP — rest adherence data not yet tracked per-set)

workoutScore = completionScore × 0.4 + performanceScore × 0.3 + effortScore × 0.2 + restScore × 0.1
```

**Score labels:**
```ts
function scoreLabel(score: number): string {
  if (score >= 9.0) return 'Excellent';
  if (score >= 8.0) return 'Great';
  if (score >= 7.0) return 'Solid';
  if (score >= 6.0) return 'Needs Work';
  return 'Recovery Day';
}
```

**Label color mapping** (for frontend reference):
```
Excellent   → #22c55e  (success green)
Great       → #6366f1  (accent purple)
Solid       → #f59e0b  (warning yellow)
Needs Work  → #f97316  (orange)
Recovery Day→ #ef4444  (danger red)
```

---

### 3. Save `workoutScore` and `scoreLabel` in `completeSession()`

**File:** `backend/src/services/session.service.ts`

In `completeSession()`, after computing the score:

```ts
const { workoutScore, scoreLabel } = computeWorkoutScore(session.sets);

// then in the prisma.workoutSession.update:
data: {
  completedAt: endTime,
  notes: data.notes,
  postEnergyLevel: data.postEnergyLevel,
  sorenessLevel: data.sorenessLevel,
  completionScore,   // still from AI (0-100 scale)
  performanceScore,  // still from AI
  workoutScore,      // NEW: 0-10 deterministic
  scoreLabel,        // NEW: string label
  aiSummary,
}
```

Also add `workoutScore: true` and `scoreLabel: true` to any Prisma select objects that currently
include `completionScore`.

---

### 4. Expose `workoutScore` and `scoreLabel` in the API response

**File:** `backend/src/controllers/session.controller.ts`

The `completeSession` handler already returns `res.json({ session })`. No change needed — Prisma
will include the new columns automatically once they're in the schema.

Check `listSessions` select in `session.service.ts` and add `workoutScore: true, scoreLabel: true`
to the select object so it appears in the history list too.

---

### 5. Update `WorkoutSession` type in mobile

**File:** `mobile/types/index.ts`

Add to `WorkoutSession` interface:
```ts
workoutScore?: number | null;
scoreLabel?: string | null;
```

---

### 6. Update the summary screen display

**File:** `mobile/app/(app)/workouts/[id]/summary.tsx`

Currently shows two `ScoreBlock` rings for `completionScore` and `performanceScore` (0–100), plus
a `ratingBanner` using `summary.sessionRating`.

Changes:
- Add a **large score display** at the top showing `session.workoutScore` (0–10, one decimal) with
  its `session.scoreLabel` — this is the headline number.
- Keep the existing AI `completionScore` / `performanceScore` blocks as supporting detail.
- Replace the `RATING_COLORS` lookup with a new `SCORE_LABEL_COLORS` map:
  ```ts
  const SCORE_LABEL_COLORS: Record<string, string> = {
    'Excellent':    '#22c55e',
    'Great':        '#6366f1',
    'Solid':        '#f59e0b',
    'Needs Work':   '#f97316',
    'Recovery Day': '#ef4444',
  };
  ```
- Fallback: if `session.workoutScore` is null (old sessions), fall back to showing AI rating banner
  as before.

**New score display component (inline):**
```tsx
// At the top of the recap, before scores row
{session?.workoutScore != null && (
  <View style={styles.scoreBanner}>
    <Text style={[styles.scoreBig, { color: labelColor }]}>
      {session.workoutScore.toFixed(1)}
    </Text>
    <Text style={[styles.scoreLabel, { color: labelColor }]}>
      {session.scoreLabel}
    </Text>
  </View>
)}
```

Style the banner as a large centered card with the score number at ~64sp, label at ~18sp.

---

## Acceptance Criteria

- [ ] `workoutScore` (0–10) and `scoreLabel` are saved on every `completeSession` call
- [ ] Score is computed before AI call — never depends on AI output
- [ ] Old sessions with `workoutScore = null` still display correctly (fall back to AI rating)
- [ ] Summary screen shows the numeric score and label with correct color
- [ ] Backend TypeScript compiles cleanly after migration
