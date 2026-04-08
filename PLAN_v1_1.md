# Average Joe AI Coach — MVP v1.1 Implementation Plan

**Date:** March 29, 2026
**Status:** Planning
**Codebase branch:** `main` at current state

---

## Executive Summary

The current app is a functional but thin workout tracker. The v1.1 target is a genuine AI coaching system with structured onboarding, multi-week program generation, daily workout guidance, a full logging experience with RPE, and AI-driven post-workout analysis and weekly program adjustment. This plan describes what to keep, what to extend, what to rebuild, and the exact sequence for doing it safely without breaking the working app.

---

## What to Keep vs. Rebuild

### Keep As-Is
- Auth system: JWT, `authMiddleware`, `auth.service.ts`, `auth.controller.ts`, login/signup screens
- `api.ts` client in mobile
- `AuthContext` and `lib/auth.ts` token management
- All UI primitives: `Button`, `Card`, `Input`, `Spinner`, `Badge`
- `lib/theme.ts` — dark color palette and spacing/typography scales
- Express app scaffolding: `app.ts`, `server.ts`, error middleware, env config, rate limiting
- Prisma setup, migration system, `prisma.ts` utility
- `ExerciseEditor` component — reuse in custom workout builder
- `useWorkouts` and `useSession` hooks — extend, not replace

### Extend Significantly
- `WorkoutSession` model: add `plannedWorkoutId`, `preEnergy`, `postEnergy`, `soreness`, `completionScore`, `performanceScore`, `aiSummary`
- `SessionSet`: add `rpe` column
- `WorkoutTemplate`: add `source` discriminator field (`ai_planned | custom`)
- `ai.service.ts`: add three new AI functions alongside existing `generateWorkout`
- `session.routes.ts` / `session.controller.ts`: add complete-with-summary endpoint
- `_layout.tsx` tabs: rename tabs, add new ones
- `dashboard.tsx`: evolve into Home tab showing today's planned workout
- `history/index.tsx`: evolve into Progress tab with charts
- `profile.tsx`: add onboarding status indicator

### Retire / Replace
- `ai.tsx` (freeform AI generator tab): replaced by Program tab
- Old `AiProgram` type and `WorkoutPreview` component: superseded by Program tab
- Direct free-text goal input for program generation: replaced by 12-section structured onboarding

---

## New Data Models — Prisma Schema Changes

All changes are additive migrations. No existing tables are dropped.

### New Models

**`UserProfile`** — One-to-one with User. Created at end of onboarding.
```
userId (unique FK)
primaryGoal
secondaryGoals (JSON array)
experienceLevel
trainingAge (years)
daysPerWeek
sessionDurationMinutes
preferredSplit
availableEquipment (JSON array)
restrictions (JSON array)
benchmarkSquat, benchmarkDeadlift, benchmarkBench, benchmarkPress, benchmarkPullup
unitSystem (kg | lbs)
onboardingCompleted (Boolean, default false)
aiCoachingSummary (Text, optional)
createdAt, updatedAt
```

**`Program`** — AI-generated multi-week training program.
```
id, userId
name, description
totalWeeks, currentWeek (Int)
status (active | completed | archived)
weeklyStructure (JSON)
progressionRules (JSON)
aiGoalSummary
createdAt, updatedAt
```

**`PlannedWorkout`** — Each individual day within a Program.
```
id, programId, userId
weekNumber, dayOfWeek
scheduledDate (DateTime optional)
name, focus (e.g., "Upper Push")
warmup (JSON)
exercises (JSON array — full exercise+sets spec)
conditioning (JSON optional)
coachNotes
estimatedDuration
isCompleted (Boolean)
completedSessionId (String optional)
createdAt
```

**`WeeklyAnalysis`** — AI output after reviewing a completed week.
```
id, programId, userId
weekNumber
adherenceScore (Float)
fatigueLevel (Int)
progressionNotes (Text)
adjustments (JSON)
recommendations (JSON array)
rawAiOutput (Text)
createdAt
```

### Modified Models

**`WorkoutSession`** — Add fields:
```
plannedWorkoutId (String, optional FK)
preEnergyLevel (Int 1-10)
postEnergyLevel (Int 1-10)
sorenessLevel (Int 1-10)
completionScore (Float)
performanceScore (Float)
aiSummary (Text — JSON string)
programId (String optional)
```

**`SessionSet`** — Add: `rpe (Int optional, 1-10)`

**`WorkoutTemplate`** — Add: `source (String, default 'custom')` — values: `'custom'`, `'ai_legacy'`

**`User`** — Add relation: `profile UserProfile?`

### Exercise Library Approach

Use a **seeded static JSON reference library** — NOT a new Prisma model for MVP:

1. `backend/src/data/exerciseLibrary.ts` — ~200 exercises with fields: `name`, `category`, `muscleGroups[]`, `equipment[]`, `movementPattern`, `defaultSets`, `defaultReps`
2. `GET /api/exercises?q=squat&category=strength&muscleGroup=legs` — in-memory filter
3. AI prompts reference canonical exercise names for consistency
4. Users can still type freeform names in custom workouts

---

## Backend Changes — Phase by Phase

### Phase 1 — Schema Migration + UserProfile + Onboarding API

**Files to create:**
- `backend/prisma/migrations/[timestamp]_v1_1_schema/`
- `backend/src/routes/profile.routes.ts`
- `backend/src/controllers/profile.controller.ts`
- `backend/src/services/profile.service.ts`
- `backend/src/data/exerciseLibrary.ts`
- `backend/src/routes/exercise.routes.ts`
- `backend/src/controllers/exercise.controller.ts`

**Files to modify:**
- `backend/prisma/schema.prisma`
- `backend/src/app.ts` — register `/api/profile` and `/api/exercises` routes
- `backend/src/services/auth.service.ts` — include `onboardingCompleted` in `/api/auth/me`

**Key endpoints:**
- `GET /api/profile/me`
- `POST /api/profile/onboarding`
- `PUT /api/profile/me`
- `GET /api/exercises?q=&category=&muscleGroup=`

### Phase 2 — Program Generation + PlannedWorkout API

**Files to create:**
- `backend/src/routes/program.routes.ts`
- `backend/src/controllers/program.controller.ts`
- `backend/src/services/program.service.ts`

**Files to modify:**
- `backend/src/services/ai.service.ts` — add `generateProgram(userId, userProfileData)`
- `backend/src/routes/ai.routes.ts` — add `/api/ai/generate-program`
- `backend/src/app.ts` — register `/api/programs`

**Key endpoints:**
- `POST /api/ai/generate-program`
- `GET /api/programs`
- `GET /api/programs/active`
- `GET /api/programs/:id`
- `PATCH /api/programs/:id/status`

### Phase 3 — Extended Session API + Post-Workout AI Summary

**Files to modify:**
- `backend/src/services/session.service.ts` — extend `completeSession`
- `backend/src/services/ai.service.ts` — add `generateWorkoutSummary(sessionData)`
- `backend/src/controllers/session.controller.ts`

**Extended complete session payload:**
```json
{
  "notes": "optional",
  "preEnergyLevel": 7,
  "postEnergyLevel": 6,
  "sorenessLevel": 4
}
```

### Phase 4 — Weekly Analysis API

**Files to create:**
- `backend/src/services/weekly.analysis.service.ts`
- `backend/src/routes/analysis.routes.ts`
- `backend/src/controllers/analysis.controller.ts`

**Key endpoints:**
- `POST /api/programs/:programId/analyze-week`
- `GET /api/programs/:programId/analysis`

---

## Mobile App Changes — Phase by Phase

### Navigation Restructure

**Current tabs:** Dashboard, Workouts, AI, History, Profile
**New tabs:** Home, Workout, Progress, Program, Profile

Mapping:
- `dashboard.tsx` → `home.tsx`
- `workouts/` → `workout/`
- `history/` → `progress/`
- `ai.tsx` → **deleted**, replaced by `program.tsx`
- `profile.tsx` → kept, extended

```
Home      → home.tsx          icon: home
Workout   → workout/          icon: barbell/dumbbell
Progress  → progress/         icon: trending-up
Program   → program.tsx       icon: calendar
Profile   → profile.tsx       icon: person
```

### Phase 1 — Onboarding Flow

**Files to create:**
- `mobile/app/(onboarding)/` — new route group
- `mobile/app/(onboarding)/_layout.tsx` — Stack layout, no tabs
- `mobile/app/(onboarding)/index.tsx` — wizard with internal step state (recommended over multiple files)
- `mobile/components/onboarding/OnboardingWizard.tsx`
- `mobile/components/onboarding/StepCard.tsx`
- `mobile/components/onboarding/OptionPicker.tsx` — multi-select chip component
- `mobile/components/onboarding/SingleSelect.tsx` — radio-style selection
- `mobile/components/onboarding/SliderInput.tsx`
- `mobile/context/OnboardingContext.tsx`

**Files to modify:**
- `mobile/app/index.tsx` — check `onboardingCompleted`; if false, redirect to `/(onboarding)/`
- `mobile/context/AuthContext.tsx` — expose `onboardingCompleted`
- `mobile/types/index.ts` — add `UserProfile`, `OnboardingData` types

**12-section wizard:**
1. Primary goal (single select)
2. Secondary goals (multi-select chips)
3. Experience level (single select)
4. Days per week (picker: 2-6)
5. Session duration (picker: 30/45/60/75/90+ min)
6. Preferred split (single select: Full body, Upper/Lower, PPL, Body part)
7. Available equipment (multi-select: Barbell, Dumbbells, Cables, Machines, Bands, etc.)
8. Physical restrictions (multi-select: Lower back, Knee, Shoulder + freetext)
9. Injury/limitation flags (multi-select)
10. Strength benchmarks (optional numeric inputs: squat/deadlift/bench/press/pullups)
11. Unit system (kg / lbs)
12. Review and confirm

Persist partial state to AsyncStorage so user can resume if app is killed mid-wizard.

### Phase 2 — Home Tab

**File:** `mobile/app/(app)/home.tsx`

- Fetch active program via `GET /api/programs/active`
- If no program: "Set up your first program" CTA → Program tab
- If active: today's planned workout card, this-week adherence, streak, recent PRs

**Files to create:**
- `mobile/components/home/TodayWorkoutCard.tsx`
- `mobile/components/home/WeekAdherenceBar.tsx`
- `mobile/hooks/useActiveProgram.ts`

### Phase 3 — Program Tab

**File:** `mobile/app/(app)/program.tsx`

Sections:
1. Active program header (name, week X of Y, status)
2. This week's planned workouts (weekly calendar view)
3. "Generate New Program" button
4. Program history (past programs)
5. Weekly analysis card

**Files to create:**
- `mobile/components/program/WeeklyScheduleView.tsx`
- `mobile/components/program/PlannedWorkoutCard.tsx`
- `mobile/components/program/ProgramHeader.tsx`
- `mobile/components/program/WeeklyAnalysisCard.tsx`
- `mobile/hooks/useProgram.ts`

### Phase 4 — Enhanced Workout Execution

**Files to create:**
- `mobile/app/(app)/workout/session/[sessionId].tsx` — enhanced active workout screen
- `mobile/app/(app)/workout/summary/[sessionId].tsx` — post-workout AI summary
- `mobile/components/workout/ActiveSetRow.tsx` — set logging with RPE
- `mobile/components/workout/EnergyLevelPicker.tsx` — 1-10 slider
- `mobile/components/workout/PostWorkoutSummary.tsx`
- `mobile/components/workout/ExerciseSearchModal.tsx`

RPE is optional — dimmed/collapsed by default, tappable to expand.

### Phase 5 — Progress Tab

**Files to create:**
- `mobile/app/(app)/progress/index.tsx`
- `mobile/app/(app)/progress/[sessionId].tsx`
- `mobile/components/progress/VolumeChart.tsx`
- `mobile/components/progress/PRList.tsx`
- `mobile/hooks/useProgress.ts`

Keep and reference existing `ProgressChart` and `SessionCard` components.

### Phase 6 — Custom Workout Builder Enhancement

- Add exercise library search to `ExerciseEditor`
- Create `ExerciseSearchModal` component
- Custom workouts tagged `source: 'custom'`

---

## AI Prompt Engineering — Four Prompts

### Prompt 1: Program Generation
- Input: structured `UserProfile` JSON (not freeform text)
- Output: `weeklyStructure`, `progressionRules`, `PlannedWorkout[]` with `warmup`, `exercises`, `conditioning`, RPE targets, `coachNotes`
- Context: benchmark lifts, restrictions, equipment constraints
- `max_tokens`: 16000 (increase from current 8000)
- Retry-once pattern if JSON parse fails

### Prompt 2: Post-Workout AI Summary
- Input: all `ExerciseLog` entries (actual vs. target), energy levels, duration, soreness
- Output JSON:
```json
{
  "completionScore": 0-100,
  "performanceScore": 0-100,
  "highlights": ["string"],
  "struggles": ["string"],
  "fatigueReading": "low | moderate | high | very_high",
  "progressionRecommendation": "string",
  "nextSessionCue": "string"
}
```

### Prompt 3: Weekly Analysis + Program Adjustment
- Input: all sessions from the week, their AI summaries, planned workout specs, UserProfile, previous analysis
- Output JSON:
```json
{
  "adherenceScore": 0-100,
  "fatigueLevel": 1-10,
  "progressionNotes": "string",
  "adjustments": [
    {
      "plannedWorkoutId": "string",
      "exerciseName": "string",
      "adjustmentType": "increase_weight | decrease_weight | increase_volume | decrease_volume | swap_exercise | add_rest_day",
      "detail": "string"
    }
  ],
  "recommendations": ["string"],
  "weekSummary": "string"
}
```

### Prompt 4: Onboarding Coaching Profile
- After onboarding completes, generate short natural-language "coaching profile"
- Stored as `UserProfile.aiCoachingSummary`
- Warm, personal tone

---

## Phase Sequencing

| Phase | What | Duration | Depends On |
|-------|------|----------|------------|
| 0 | Schema migration + exercise library | 2-3 days | nothing |
| 1 | Onboarding + UserProfile API + mobile wizard | 3-4 days | Phase 0 |
| 2 | Program generation backend | 3-4 days | Phase 1 |
| 3 | Program tab + Home tab (mobile) | 4-5 days | Phase 2 |
| 4 | Enhanced workout execution + post-workout summary | 4-5 days | Phase 3 |
| 5 | Progress tab + weekly analysis | 3-4 days | Phase 4 |
| 6 | Custom workout builder enhancement | 2-3 days | Phase 0 |

---

## Key Architectural Decisions

1. **PlannedWorkout stores exercises as JSON** — avoids combinatorial row explosion; tradeoff: cannot query by individual exercise across planned workouts (not needed in v1.1)

2. **SessionSet remains relational** — needed for efficient time-series queries ("all bench press sets over 12 weeks")

3. **AI summary is synchronous at completion for MVP** — user sees ~2-4s loading state; 15s timeout fallback to generic message

4. **Onboarding is a separate route group `(onboarding)`** — cleaner step navigation and back-button handling vs. modals

5. **Old WorkoutTemplate system preserved** — existing user data safe; new system adds alongside, not replacing

6. **Rate limiting for AI endpoints** — `generate-program`: 3/hour; `workout-summary`: 20/hour; `weekly-analysis`: 5/hour

---

## Risks and Mitigation

| Risk | Mitigation |
|------|-----------|
| Claude output for program generation is large (may exceed tokens or produce malformed JSON) | Increase max_tokens to 16000; use retry-once pattern; consider generating one week at a time |
| Navigation restructure breaks existing deep links | No external deep links in v1 — safe. Update `index.tsx` redirect from `dashboard` to `home` |
| New `aiSummary` field bloats list queries | Exclude from list queries; only fetch in detail queries |
| Onboarding state loss if app killed mid-wizard | Persist `OnboardingContext` to AsyncStorage; resume from furthest completed step on mount |
| RPE adds friction to logging | RPE is optional, dimmed by default; "Done" button works without it |

---

## File Reference Map

### Backend (critical files)
```
backend/prisma/schema.prisma                     ← All model changes
backend/src/services/ai.service.ts               ← Add generateProgram, generateWorkoutSummary
backend/src/services/program.service.ts          ← New: Program + PlannedWorkout CRUD
backend/src/services/profile.service.ts          ← New: UserProfile CRUD
backend/src/services/weekly.analysis.service.ts  ← New: WeeklyAnalysis + AI weekly review
backend/src/data/exerciseLibrary.ts              ← New: static exercise catalog
backend/src/services/session.service.ts          ← Extend completeSession
backend/src/app.ts                               ← Register new routes
```

### Mobile (critical files)
```
mobile/app/(onboarding)/index.tsx                ← New: 12-step onboarding wizard
mobile/app/(app)/_layout.tsx                     ← Modify: new tab names/icons
mobile/app/(app)/home.tsx                        ← Rename+rebuild from dashboard.tsx
mobile/app/(app)/program.tsx                     ← New: program management tab
mobile/app/(app)/workout/session/[sessionId].tsx ← New: enhanced active workout screen
mobile/app/(app)/workout/summary/[sessionId].tsx ← New: post-workout AI summary screen
mobile/app/(app)/progress/index.tsx              ← Rename+extend from history/index.tsx
mobile/context/OnboardingContext.tsx             ← New: wizard state
mobile/context/AuthContext.tsx                   ← Modify: expose onboardingCompleted
mobile/types/index.ts                            ← Modify: add all new types
mobile/hooks/useActiveProgram.ts                 ← New: active program + today's workout
mobile/hooks/useProgram.ts                       ← New: program CRUD hook
```
