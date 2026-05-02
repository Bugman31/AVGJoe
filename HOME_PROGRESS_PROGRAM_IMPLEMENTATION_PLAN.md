# Home, Progress, and Program Overhaul Plan

## Goal
Bring the app closer to the reference designs by upgrading the three highest-impact product surfaces:

1. Home dashboard
2. Progress and recap system
3. Program management and orchestration

This plan is grounded in the current AVGJoe app structure as of May 1, 2026:

- Home currently shows greeting, streak, in-progress workout, basic no-program CTA, today workout, and quick actions.
- Progress currently shows session history plus exercise-specific history lookup.
- Program currently shows active program, next workout, week schedule, and weekly analysis.

The target is not a pixel copy of the mock. The target is a stronger user experience where:

- the next best action is always obvious
- progress feels visible and motivating
- program flow feels structured and trustworthy
- existing backend and AI investments are surfaced better

---

## Product Principles

### What We Are Optimizing For

- Clarity: users should know what to do next in under 3 seconds.
- Momentum: every core screen should reinforce progress, not just store data.
- Continuity: Home, Program, Workout, Progress, and Recap should feel like one connected system.
- Trust: metrics should be explainable and consistent with workout logs, not magical.

### What We Are Not Doing In V1

- No full redesign of every tab at once.
- No heavy native charting overhaul if lightweight chart primitives can ship faster.
- No speculative AI features that do not connect to logged workout data.
- No dependency on live Apple Health data for core dashboard/progress value.

---

## Workstream 1: Home Dashboard

## Current State

Home already has:

- greeting and streak
- in-progress workout resume banner
- no-program CTA
- today workout card
- weekly adherence basics
- quick actions

What is missing versus the target:

- stronger weekly progress summary
- recovery/readiness snapshot
- recent activity with meaningful signals
- more compact at-a-glance structure
- tighter relationship between Home and Program/Progress

## Target Outcome

Home becomes the operational command center for the week:

- today’s workout is primary
- weekly progress is visible at a glance
- readiness/recovery signal exists and is easy to understand
- recent completed sessions and key wins are visible
- users without a program are explicitly guided to choose/build one

## V1 Scope

### Section A: Hero / Primary Action

- Keep the greeting and current streak.
- Replace the current today card with a stronger hero card containing:
  - workout name
  - focus
  - estimated duration
  - exercise count
  - optional coach note
  - primary CTA: `Start Workout`
- If there is an in-progress workout, show resume state above the hero and suppress duplicate start messaging.
- If there is no active program, show a stronger first-use CTA block with two actions:
  - `Build with AI`
  - `Browse Programs`

### Section B: Weekly Progress Card

- Add a compact weekly summary card containing:
  - completed workouts this week
  - total scheduled workouts this week
  - adherence percentage
  - current week number
  - simple goal ring or progress bar
- Optional sub-metrics:
  - total sets this week
  - total volume this week

### Section C: Recovery / Readiness Card

- Add a lightweight recovery card for V1 using existing app data:
  - last session post-energy
  - last soreness value
  - days since last workout
  - weekly adherence trend
- Translate those into a user-friendly label:
  - `Ready`
  - `Moderate`
  - `Recover`
- Do not overstate precision. This is a coaching heuristic, not a diagnosis.

### Section D: Recent Activity

- Add a recent activity module with the last 3 completed sessions.
- Each row should show:
  - workout name
  - completion date
  - workout score if available
  - volume or set count
- Tapping a row should open recap/history for that session.

## Backend / Data Needs

### Likely New Aggregation Endpoint

Add a home summary endpoint, for example:

`GET /api/dashboard/home`

Suggested payload:

```ts
{
  activeProgram: Program | null;
  todayWorkout: PlannedWorkout | null;
  inProgressSession: WorkoutSession | null;
  streak: number;
  weeklySummary: {
    weekNumber: number | null;
    completed: number;
    total: number;
    adherencePercent: number;
    totalSets: number;
    totalVolume: number;
  };
  readiness: {
    label: 'ready' | 'moderate' | 'recover';
    score: number | null;
    basedOn: {
      lastPostEnergy: number | null;
      lastSoreness: number | null;
      daysSinceWorkout: number | null;
    };
  };
  recentSessions: Array<{
    id: string;
    name: string;
    completedAt: string;
    workoutScore: number | null;
    scoreLabel: string | null;
    totalVolume: number;
    setsCompleted: number;
  }>;
}
```

This is better than making Home stitch together many calls on device.

## Frontend Implementation Tasks

### Data Layer

- Add `useHomeDashboard()` hook.
- Keep `useActiveProgram()` only if still reused elsewhere; avoid duplicate fetch logic on Home.
- Cache and refetch on focus.

### UI Components

- `DashboardHeroCard`
- `WeeklyProgressCard`
- `ReadinessCard`
- `RecentActivityList`
- `NoProgramChoiceCard`

### Migration Approach

- Replace Home incrementally.
- Preserve existing routes and workout start behavior.
- Keep current Home in place behind the same route; no navigation change required.

## Acceptance Criteria

- Users with a program can open Home and immediately start or resume training.
- Users without a program clearly see both build and browse options.
- Weekly adherence and recent progress are visible without going to another tab.
- Home loads from a single summary payload or equivalent efficient data shape.

---

## Workstream 2: Progress and Recap System

## Current State

Progress already has:

- session history
- exercise history search
- line chart for selected exercise
- links to insights and calendar

What is missing versus the target:

- top-level progress dashboard
- time-range filtering
- key KPI cards like estimated 1RM and weekly volume
- clearer consistency metrics
- stronger recap as a first-class experience
- tighter bridge between completed workouts and long-term progress

## Target Outcome

Progress should answer three questions quickly:

1. Am I improving?
2. Am I being consistent?
3. What changed recently?

Workout recap should answer:

1. How good was that session?
2. What did I accomplish?
3. What should I do next?

## V1 Scope

### Section A: Progress Overview Dashboard

Add a top-level progress dashboard with range filters:

- `1W`
- `1M`
- `3M`
- `1Y`
- `All`

Key cards:

- Estimated 1RM trend for selected primary lift
- Weekly volume
- Consistency score
- Workout completion count

### Section B: Progress Metrics

For V1, prioritize metrics users understand easily:

- estimated 1RM by lift
- volume by week
- sessions completed by week
- average workout score
- adherence / consistency

Do not overload the first version with too many derived numbers.

### Section C: Workout Recap Upgrade

Promote recap into a more meaningful destination after session completion and from history.

Recap should show:

- workout score + score label
- volume
- sets completed vs planned
- average RPE
- top highlights:
  - PRs
  - volume increase
  - completion consistency
  - load progression
- CTA to:
  - view full recap/history
  - open Progress
  - optionally ask AI follow-up

### Section D: Exercise Trend Views

Keep the current exercise-history search, but embed it under a broader progress shell.

Enhancements:

- recent PR badge count
- top lift shortcuts
- cleaner chart summary row
- option to switch chart metric:
  - max weight
  - estimated 1RM
  - volume

### Section E: Consistency and Calendar Tie-In

Keep calendar in its own screen, but integrate its signal into Progress:

- workouts completed this week
- current streak
- completion heat summary

## Backend / Data Needs

### New or Expanded Summary Endpoint

Add a progress summary endpoint, for example:

`GET /api/progress/summary?range=3m`

Suggested payload:

```ts
{
  range: '1w' | '1m' | '3m' | '1y' | 'all';
  overview: {
    sessionsCompleted: number;
    totalVolume: number;
    consistencyPercent: number;
    avgWorkoutScore: number | null;
  };
  topLiftSummaries: Array<{
    exerciseName: string;
    estimatedOneRepMaxCurrent: number | null;
    estimatedOneRepMaxDelta: number | null;
    volumeCurrent: number;
    volumeDelta: number | null;
  }>;
  charts: {
    weeklyVolume: Array<{ bucket: string; value: number }>;
    sessionFrequency: Array<{ bucket: string; value: number }>;
  };
}
```

### Recap Data Shape

Expand recap/session summary endpoint if needed:

- planned sets count
- logged sets count
- average RPE
- PR highlights
- progression summary

### Metric Derivation Rules

Define and document these centrally:

- estimated 1RM formula
- volume calculation
- consistency formula
- workout score formula source of truth

This should live in shared backend service logic so Home/Progress/Recap agree.

## Frontend Implementation Tasks

### Data Layer

- `useProgressSummary(range)`
- `useWorkoutRecap(sessionId)`
- `useExerciseTrend(exerciseName, metric, range)`

### UI Components

- `RangeSegmentedControl`
- `ProgressOverviewCard`
- `KpiMetricCard`
- `VolumeBarChart`
- `ConsistencyCard`
- `WorkoutRecapHero`
- `WorkoutHighlightsList`

### Screen Structure

Refactor Progress into:

- overview section first
- exercise trends second
- session history third

## Acceptance Criteria

- Users can understand progress at a glance without searching for an exercise first.
- Workout completion leads into a recap that feels motivating and useful.
- The same core numbers remain consistent across recap, history, and progress.
- Time-range filtering works and feels fast.

---

## Workstream 3: Program Management Overhaul

## Current State

Program already has:

- active program state
- up next workout
- current week schedule
- weekly analysis
- browse/build entry points
- new-user onboarding prompt

What is missing versus the target:

- stronger distinction between current and past programs
- better “today / tomorrow / this week” schedule framing
- easier program editing and lifecycle control
- clearer first-run choose/build experience
- richer program progress overview

## Target Outcome

Program becomes the source of truth for plan management:

- users know what plan is active
- users can browse past plans
- users can inspect current week and next actions
- program progress over time is visible
- editing and replacement feel intentional and safe

## V1 Scope

### Section A: Current vs Past Programs

Split Program into two states:

- `Current`
- `Past`

`Current`:

- active program summary
- current week progress
- upcoming workouts
- weekly analysis

`Past`:

- archived/completed program cards
- status
- duration
- completion date

### Section B: Current Program Summary Card

Expand the active program header to include:

- program name
- split / duration
- current week
- completion progress
- workouts completed this week
- CTA to edit or replace

### Section C: Schedule UX

Improve schedule presentation:

- today card
- tomorrow / next card
- day-by-day week list
- clear completed / skipped / upcoming states

Optional enhancements:

- estimated duration
- exercise count
- mini focus labels

### Section D: Program Lifecycle

Users need safer control over plans:

- archive current program
- mark complete
- replace with new build or browse selection
- view past programs

Replacement flow should clearly explain:

- old active plan becomes archived
- history remains intact
- new plan becomes current

### Section E: Edit Program

The current build/edit path should evolve toward a stronger edit experience:

- edit program metadata
- reorder workouts
- adjust exercises inside a planned workout
- duplicate a workout across weeks
- save without losing structure

This does not have to be fully in V1 if the existing custom program builder can cover most edits.

### Section F: First-Use Program Choice

After onboarding:

- show welcome
- land on Program with onboarding prompt
- present both:
  - `Build with AI`
  - `Browse Community Programs`

No preloaded plan for normal users.

## Backend / Data Needs

### Expanded Program Listing

Add or extend:

`GET /api/programs`

Suggested response:

```ts
{
  current: ProgramSummary | null;
  past: ProgramSummary[];
}
```

Where `ProgramSummary` includes:

- id
- name
- status
- totalWeeks
- currentWeek
- createdAt
- archivedAt or completedAt if available
- workout counts
- adherence summary

### Program Status Model

If not already tracked well enough, add support for:

- `active`
- `completed`
- `archived`

Consider whether timestamps for completion/archive should be added.

### Weekly Summary Helpers

Provide one normalized program summary payload that includes:

- current week workouts
- next workout
- week completion counts
- latest weekly analysis

## Frontend Implementation Tasks

### Data Layer

- `useProgramsOverview()`
- `useProgramHistory()`
- `useProgramCurrentState()`

### UI Components

- `ProgramTabSwitcher`
- `CurrentProgramHero`
- `ProgramHistoryCard`
- `WeeklyScheduleList`
- `NextWorkoutCard`
- `ProgramLifecycleActions`

### Navigation

Maintain existing routes, but make the Program tab the default management surface.

## Acceptance Criteria

- New users can complete onboarding and immediately choose or generate a program.
- Users with a current plan can see what is next and what has been completed this week.
- Users can distinguish current vs old plans.
- Program replacement is clear and safe.

---

## Cross-Cutting Dependencies

## Shared Data / Logic Work

These should be solved once and reused:

- workout score normalization
- total volume calculation
- planned vs completed set counts
- consistency formula
- estimated 1RM formula
- recent activity summaries

## Design System / Component Work

Build reusable primitives instead of screen-specific one-offs:

- metric cards
- segmented control
- range filters
- chart wrappers
- progress rings / bars
- empty-state cards
- recap highlight rows

## Analytics / Instrumentation

Track:

- Home CTA taps
- Program build vs browse choice
- Progress filter usage
- Recap view rate after workout completion
- Program replacement flow completion

---

## Recommended Delivery Sequence

## Phase 1: Data Foundation

- Add backend summary endpoints for Home and Progress
- Normalize metric derivations
- Expand program listing/current-state payloads

## Phase 2: Home Dashboard

- Ship upgraded Home first
- This has the broadest daily impact
- Validate no-program and active-program states

## Phase 3: Program Overhaul

- Add current/past split
- improve week schedule and next workout framing
- strengthen first-use program choice

## Phase 4: Progress Overview

- Add range-filtered KPI dashboard
- keep exercise history underneath
- ship recap upgrades alongside or immediately after

## Phase 5: Polish and Integration

- align copy and visual language across Home / Program / Progress / Recap
- add small animation and skeleton states
- refine edge cases like no workouts, archived plans, partial weeks

---

## Risks and Mitigations

## Risk: Too many bespoke endpoints

Mitigation:

- prefer a few screen-level summary endpoints over many tiny requests

## Risk: Metrics feel inconsistent across screens

Mitigation:

- centralize formulas in backend services
- document source-of-truth rules

## Risk: Overbuilding recovery/readiness without solid data

Mitigation:

- ship a simple heuristic first
- label it clearly
- improve later with richer inputs

## Risk: Program editing scope expands too quickly

Mitigation:

- separate V1 program overview/lifecycle from full builder/editor ambitions

---

## Suggested Definition of Done

This initiative is done when:

- Home clearly tells users what to do next and how their week is going
- Progress shows meaningful improvement without requiring exercise search first
- Recap feels motivating and actionable after a workout
- Program makes current plan management and next workouts obvious
- new users finish onboarding and intentionally choose/build a plan instead of landing in a dead-end or receiving a hidden default

---

## Immediate Next Step

Recommended first execution step:

1. Define backend summary payloads for Home and Progress
2. Lock metric formulas for workout score, consistency, volume, and estimated 1RM
3. Build Home dashboard first, because it has the fastest user-facing payoff and informs the shared component system for the rest
