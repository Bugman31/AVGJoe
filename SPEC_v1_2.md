# Average Joe AI Coach — Feature Spec v1.2

**Created:** 2026-04-28
**Status:** Approved — not started
**Stack:** React Native / Expo (mobile), Express / Prisma / SQLite (backend)
**Navigation:** Home · Workout · Progress · Program · Profile (unchanged)

---

## Context

This spec captures the delta between the current working app and the target state described in the
Average Joe's AI Workout Tracker MVP spec. The app already has auth, onboarding, program generation,
workout execution (with RPE + rest timer banner), workout summary with AI, progress charts, exercise
library, and program builder. This spec fills the remaining gaps.

---

## Guiding Principles (from original spec)

- Logging a set must be possible in 1–2 taps
- AI feedback must be ≤ 30 words, specific to the set, never generic
- Deterministic rules drive progression math; AI explains it in human language
- The active workout screen is the heart of the app — everything else is secondary

---

## Phase 1 — Deterministic Progression Engine + AI Set Feedback Backend

**Goal:** Give the active workout a brain. Every completed set produces a `SetRecommendation` and
triggers a short AI coach message.

### 1A — Progression Service (`backend/src/services/progression.service.ts`)

Implement deterministic rules per spec §9. No AI involved — pure logic.

```
Input:  exercise name, set number, targetRepMin, targetRepMax, actualReps, rpe,
        previousSets[], progressionType ('strength' | 'hypertrophy' | 'conditioning')

Output: SetRecommendation {
  nextWeight?:       number
  nextReps?:         number
  nextRestSeconds?:  number
  action:            'increase' | 'decrease' | 'hold' | 'stop' | 'add_rest'
  reason:            string   // human-readable, used as AI prompt context
}
```

**Strength rules:**
- Actual reps >= targetRepMax AND rpe <= 8 → increase weight (5 lb upper, 10 lb lower)
- Actual reps < targetRepMin OR rpe >= 9.5 → decrease weight 5–10%, add 30–60s rest
- Actual reps in range AND rpe 8–9 → hold weight

**Hypertrophy / double progression rules:**
- All sets at top of rep range with rpe <= 8 → increase weight next session
- Reps hit but rpe high → hold
- Missed reps → decrease or reduce volume

**Conditioning rules:**
- Track time/rounds/reps/effort
- Output pacing feedback and next-session target

Classify exercise as upper/lower by muscle group lookup against `exerciseLibrary`.

### 1B — AI Set Feedback Endpoint (`POST /api/ai/set-feedback`)

Auth required. Rate limit: 60/hour per user.

**Request:**
```json
{
  "sessionId":            "string",
  "exerciseName":         "string",
  "setNumber":            1,
  "targetSets":           4,
  "targetRepMin":         4,
  "targetRepMax":         6,
  "actualWeight":         250,
  "actualReps":           5,
  "rpe":                  8,
  "previousSetSummary":   "Set 1: 250 × 5 @ RPE 7",
  "recommendation":       "Hold at 250 lbs — good RPE range",
  "userGoal":             "strength"
}
```

**Response:**
```json
{ "feedback": "Solid set at RPE 8. Stay at 250 for set 3 — you're right in the zone." }
```

**Prompt template** (≤ 30 word constraint enforced server-side — truncate if exceeded):
```
You are a strength coach inside a workout app. Give short, specific feedback after a set.
Rules: under 30 words, mention the recommended action, no generic motivation, no medical advice.

Exercise: {{exerciseName}} | Set {{setNumber}} of {{targetSets}}
Target: {{targetRepMin}}-{{targetRepMax}} reps | Actual: {{actualReps}} @ {{actualWeight}} lbs | RPE {{rpe}}
Previous set: {{previousSetSummary}}
System recommendation: {{recommendation}}
User goal: {{userGoal}}

Return only the coach message.
```

### 1C — Type additions (`mobile/types/index.ts`)

Add:
```ts
interface SetRecommendation {
  nextWeight?:      number;
  nextReps?:        number;
  nextRestSeconds?: number;
  action:           'increase' | 'decrease' | 'hold' | 'stop' | 'add_rest';
  reason:           string;
}
```

### 1D — Wire progression to session completion

Modify `backend/src/services/session.service.ts` → `logSet()`:
- After saving the set row, call `progressionService.recommend(...)` synchronously
- Return the `SetRecommendation` alongside the saved set in the response
- Do NOT call AI from here — AI is triggered from mobile after set is logged

**Files to create:**
- `backend/src/services/progression.service.ts`
- `backend/src/routes/ai.routes.ts` (add `set-feedback` to existing or new file)
- `backend/src/controllers/ai.controller.ts` (add `getSetFeedback`)

**Files to modify:**
- `backend/src/services/session.service.ts` — `logSet` returns `SetRecommendation`
- `backend/src/app.ts` — register new route if needed
- `mobile/types/index.ts` — add `SetRecommendation`

---

## Phase 2 — AI Coach Panel (Active Workout Screen)

**Goal:** After logging a set, display a 1–2 line AI coach message with quick action buttons.
This is the most visible new feature.

### UI Spec

Location: inside `mobile/app/(app)/workouts/active/[sessionId].tsx`, below the set logging controls.

**AI Coach Card** — appears after each set is logged, dismissible.

```
┌─────────────────────────────────────────────┐
│  🟣  Coach                                   │
│  "Solid set at RPE 8. Stay at 250 for        │
│   set 3 — you're right in the zone."         │
│                                              │
│  [Why?]  [More rest]  [Adjust next set]      │
└─────────────────────────────────────────────┘
```

- Purple left border / icon (aiPurple: `#9B5CFF`)
- Animates in from below after set is logged (slide up, ~250ms)
- Replaced by new card when next set is logged; dismissed when exercise changes
- Loading state: shimmer/skeleton while awaiting AI response

**Quick action buttons:**
- **Why?** → expands the card to show the `SetRecommendation.reason` text (no extra API call)
- **More rest** → adds 30s to the rest timer and dismisses the card
- **Adjust next set** → pre-fills the next set's weight/reps fields with `recommendation.nextWeight` / `recommendation.nextReps`

### Flow

1. User taps "Log Set" → set saved to backend → `SetRecommendation` returned in response
2. Mobile immediately calls `POST /api/ai/set-feedback` with the set data + recommendation
3. Card shows skeleton → fills with feedback text when response arrives (target < 2s)
4. If API call fails or times out (5s): show recommendation reason text only, no card failure state

### New component: `mobile/components/workouts/AICoachCard.tsx`

Props:
```ts
{
  feedback:       string | null;   // null = loading
  reason:         string;          // from SetRecommendation, shown on Why?
  recommendation: SetRecommendation;
  onMoreRest:     () => void;
  onAdjustNext:   (weight?: number, reps?: number) => void;
  onDismiss:      () => void;
}
```

**Files to create:**
- `mobile/components/workouts/AICoachCard.tsx`

**Files to modify:**
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — add AI coach card render + set-feedback call

---

## Phase 3 — Rest Timer Full Screen

**Goal:** Replace the rest timer banner with an optional full-screen rest timer that has a circular
countdown, AI tip, and time controls.

### UI Spec (Screen 4 from original spec)

Triggered by: tapping the rest timer banner OR the floating rest timer button (added in Phase 4).
Presented as a modal over the active workout screen (not a route push).

```
┌─────────────────────────────┐
│  Bench Press                │
│  Next: Set 3 of 4           │
│                             │
│       ┌─────────┐           │
│       │  1:47   │ ← circular│
│       │countdown│           │
│       └─────────┘           │
│  Suggested rest: 2:30       │
│                             │
│  [−30s]        [+30s]       │
│                             │
│  ┌────────────────────────┐ │
│  │ 🟣 Your last set was    │ │
│  │ RPE 8. Take full rest. │ │
│  └────────────────────────┘ │
│                             │
│     [End rest early →]      │
└─────────────────────────────┘
```

- Circular countdown: use existing `react-native-svg` or simple `Animated` arc
- AI tip: derived from last set's RPE + recommendation (no new API call — use data already on hand)
  - RPE ≥ 9 → "Your last set was near-maximal. Take the full rest."
  - RPE ≤ 7 → "You felt strong. You can start a bit early if you're ready."
  - missed reps → "You missed reps — take extra time before retrying."
  - default → "Rest fully before your next set."
- +30s / −30s buttons (minimum rest = 10s, no maximum)
- "End rest early" → closes modal, returns to active workout

### New component: `mobile/components/workouts/RestTimerModal.tsx`

Props:
```ts
{
  visible:          boolean;
  durationSeconds:  number;
  exerciseName:     string;
  setInfo:          string;        // e.g. "Set 3 of 4"
  aiTip:            string;
  onClose:          () => void;    // end rest early
  onComplete:       () => void;    // timer naturally expires
}
```

**Files to create:**
- `mobile/components/workouts/RestTimerModal.tsx`

**Files to modify:**
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — wire tapping the rest banner to open modal
- `mobile/hooks/useRestTimer.ts` — expose `openFullScreen` / `closeFullScreen` if needed

---

## Phase 4 — Bottom Workout Summary Bar

**Goal:** Show live workout stats in a persistent bar at the bottom of the active workout screen.

### UI Spec

Persistent bar above the bottom safe area, below the scrollable content.

```
┌────────────────────────────────────────────┐
│  Vol: 12,450 lb   Sets: 8/18   ⏱ 0:47  🔔 │
└────────────────────────────────────────────┘
```

Fields:
- **Vol:** running total of `actualWeight × actualReps` across all logged sets
- **Sets:** `completedSets / totalSets` across all exercises in the workout
- **Timer:** elapsed workout duration (MM:SS, counting up from session start)
- **🔔 (rest bell icon):** floating button that opens `RestTimerModal` for the current exercise

The bar is always visible while the active workout is open. It does not scroll.

**Files to modify:**
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — add summary bar component + live volume calculation

New sub-component (inline or separate file): `WorkoutSummaryBar`

---

## Phase 5 — Upcoming Exercises List

**Goal:** Show the user what's coming next during the workout.

### UI Spec

Below the active exercise card and AI coach panel, above the keyboard / summary bar.
A collapsed horizontal scroll or short list (max 3 items visible).

```
Up next:
┌──────────────────┐  ┌──────────────────┐
│ Incline DB Press │  │ Overhead Press   │
│ 3 × 8–10         │  │ 3 × 6–8          │
│ ● ● ● (sets)     │  │ ○ ○ ○            │
└──────────────────┘  └──────────────────┘
```

- Exercises already completed show a checkmark
- Active exercise is not shown in the list (it's in the main card above)
- Tapping an upcoming exercise does nothing for MVP (no skip/reorder)

**Files to modify:**
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — add upcoming exercise list section

---

## Phase 6 — Workout Score Formula

**Goal:** Ensure the recap screen uses the spec-defined scoring formula and displays the correct label.

### Formula

```ts
score =
  completionScore * 0.4 +   // % of planned sets completed (0–10)
  performanceScore * 0.3 +  // % of sets where actual reps >= targetRepMin (0–10)
  effortScore * 0.2 +       // RPE quality: 6–9 = 10, <6 = 6, >9 = 7 (avoids both too easy/too hard)
  restScore * 0.1;          // % of rests taken within 30s of recommended (0–10)
```

Labels:
- 9.0–10.0 → **Excellent**
- 8.0–8.9 → **Great**
- 7.0–7.9 → **Solid**
- 6.0–6.9 → **Needs Work**
- < 6.0 → **Recovery Day**

Score is computed server-side in `session.service.ts` `completeSession()` and stored on `WorkoutSession`.
If rest data is unavailable, use `restScore = 7` (neutral default).

**Files to modify:**
- `backend/src/services/session.service.ts` — implement scoring formula in `completeSession()`
- `mobile/app/(app)/workouts/[id]/summary.tsx` — display score label with color coding

---

## Phase 7 — Calendar Screen

**Goal:** Monthly calendar view of workout history with tap-to-view.

### Navigation

New tab-stack screen: `mobile/app/(app)/progress/calendar.tsx`
Accessible from the Progress tab via a "Calendar" button/link.

### UI Spec

```
◀  April 2026  ▶

Mo Tu We Th Fr Sa Su
       1  2  3  4  5
 6  7  8  9 10 11 12
13 14 15 16 17 18 19   ← 14=✓(green dot), 16=✓
20 21 22 23 24 25 26   ← 21=✓, 23=✓
27 28 29 30
```

- Completed workout days: green dot under date
- Today: highlighted circle
- Tapping a completed day → navigates to `progress/[sessionId]` for that session
- If multiple sessions in a day: show a count badge; tap opens a small picker

**New component:** `mobile/components/progress/WorkoutCalendar.tsx`
Data: `GET /api/sessions?from=YYYY-MM-01&to=YYYY-MM-31` (existing endpoint, filtered by date range)

**Files to create:**
- `mobile/app/(app)/progress/calendar.tsx`
- `mobile/components/progress/WorkoutCalendar.tsx`

**Files to modify:**
- `mobile/app/(app)/progress/index.tsx` — add "Calendar" link/button

---

## Phase 8 — AI Insights Screen

**Goal:** Surface pattern-level intelligence beyond charts.

### Navigation

New screen: `mobile/app/(app)/progress/insights.tsx`
Accessible from Progress tab alongside Calendar.

### UI Spec

Scrollable list of insight cards. Each card:
```
┌─────────────────────────────────────────┐
│  📈  Pressing strength                   │
│  Your bench is up 8% over 4 weeks while │
│  row volume has been flat. Consider      │
│  adding a pull day next week.            │
└─────────────────────────────────────────┘
```

### Insight types (MVP — all derived client-side from session history, no new backend)

| Insight | Source data |
|---------|-------------|
| Pressing vs pulling strength trend | Compare volume/e1RM across push vs pull sessions |
| Best performance day of week | Group sessions by weekday, compare avg score |
| Rest time vs rep performance | Correlate `restAfterSeconds` with missed reps |
| Most skipped exercises | Exercises in planned workouts not appearing in sessions |
| Workout consistency trend | Sessions per week over last 8 weeks |
| Average RPE trend | Is effort trending up (overtraining risk) or down (under-challenging)? |

Insights are computed in `mobile/hooks/useInsights.ts` using existing session data from the Progress API.
No new backend endpoint needed for MVP.

**Files to create:**
- `mobile/app/(app)/progress/insights.tsx`
- `mobile/components/progress/InsightCard.tsx`
- `mobile/hooks/useInsights.ts`

**Files to modify:**
- `mobile/app/(app)/progress/index.tsx` — add "Insights" link/button

---

## Phase 9 — AI Coach Chat Screen

**Goal:** Let users ask workout-specific questions during a session.

### Navigation

Accessed from the active workout screen via a chat icon button in the header.
Route: `mobile/app/(app)/workouts/active/chat.tsx` (modal presentation).

### UI Spec

```
┌────────────────────────────────────┐
│  ← AI Coach           [×]          │
├────────────────────────────────────┤
│  Context: Push Day · Set 6/18      │
│  Vol: 8,200 lb · Avg RPE: 7.8      │
├────────────────────────────────────┤
│                                    │
│  Suggested:                        │
│  [Should I increase weight?]       │
│  [Why did reps drop?]              │
│  [Give me a sub for dips]          │
│  [How am I doing today?]           │
│                                    │
│  ── Chat history ──                │
│                                    │
├────────────────────────────────────┤
│  [Ask your coach...]    [Send ↑]   │
└────────────────────────────────────┘
```

### Backend endpoint: `POST /api/ai/coach-chat`

Auth required. Rate limit: 30/hour per user.

**Request:**
```json
{
  "message":      "Should I increase weight on next bench set?",
  "sessionId":    "string",
  "conversationHistory": [
    { "role": "user",      "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Backend injects workout context (exercise list, set logs, avg RPE, user goal) into system prompt before forwarding to Claude. Response is streamed or returned as single message.

**Response:** `{ "reply": "string" }`

Suggested prompts (hardcoded, always shown):
- "Should I increase weight?"
- "Why did my reps drop?"
- "Give me a substitution for this exercise."
- "How am I doing today?"
- "Should I stop or keep going?"

**Files to create:**
- `mobile/app/(app)/workouts/active/chat.tsx`
- `backend/src/controllers/ai.controller.ts` — add `coachChat` handler

**Files to modify:**
- `backend/src/routes/ai.routes.ts` — add `POST /api/ai/coach-chat`
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — add chat icon to header

---

## Phase 10 — Component Library Standardization

**Goal:** Align existing component names with the spec §18 naming convention.
This is a rename/alias pass — no visual changes.

| Spec name | Current file | Action |
|-----------|-------------|--------|
| `AppCard` | `components/ui/Card.tsx` | Export alias |
| `PrimaryButton` | `components/ui/Button.tsx` | Export alias (variant="primary") |
| `SecondaryButton` | `components/ui/Button.tsx` | Export alias (variant="secondary") |
| `MetricCard` | does not exist | Create thin wrapper: Card + label + value |
| `RpeSelector` | `components/workouts/RpePicker.tsx` | Export alias |
| `RestTimerCircle` | `components/workouts/RestTimerModal.tsx` | Extract circular arc as standalone component |
| `AICoachCard` | `components/workouts/AICoachCard.tsx` | Created in Phase 2 |
| `WorkoutSummaryBar` | inline in active screen (Phase 4) | Extract to own file |
| `ExerciseListItem` | inline in library.tsx | Extract to own file |
| `InsightCard` | `components/progress/InsightCard.tsx` | Created in Phase 8 |
| `ProgramDayCard` | existing in program components | Review + alias |
| `ProgressBar` | does not exist | Create: thin bar, `value` 0–1, optional label |

**Files to create:**
- `mobile/components/ui/MetricCard.tsx`
- `mobile/components/ui/ProgressBar.tsx`
- `mobile/components/workout/ExerciseListItem.tsx`
- `mobile/components/ui/index.ts` (barrel export of all UI primitives)

---

## Acceptance Criteria

The spec is complete when:

- [ ] Logging a set in the active workout returns a `SetRecommendation` with action + reason
- [ ] An AI coach message appears after each logged set (< 2s, ≤ 30 words)
- [ ] "Why?" expands the recommendation reason without a new API call
- [ ] "More rest" adds 30s to the rest timer
- [ ] "Adjust next set" pre-fills weight/reps from the recommendation
- [ ] Tapping the rest timer banner opens a full-screen circular countdown
- [ ] +30s / −30s controls work on the rest timer
- [ ] An AI tip is shown during rest derived from last set's RPE
- [ ] Bottom summary bar shows running volume, sets completed, elapsed time
- [ ] Upcoming exercises list shows remaining exercises with set counts
- [ ] Workout recap score uses the 40/30/20/10 formula with correct label
- [ ] Calendar screen shows monthly workout markers with tap-to-session
- [ ] AI Insights screen shows at least 4 pattern cards derived from session history
- [ ] AI Coach Chat opens from active workout, accepts freeform message, returns contextual response
- [ ] App runs without crashing in Expo after all phases

---

## Out of Scope (this spec)

- Nutrition / macro tracking
- Wearable / Apple Watch integration
- Social feed or sharing
- Voice coaching
- Camera form analysis
- Firebase migration (keep Express/Prisma)
- Web frontend changes
