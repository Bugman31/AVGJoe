# Phase 8 — AI Insights Screen

**Status:** Not started  
**Depends on:** Nothing new — all data comes from existing session API

---

## Goal

Add an Insights screen to the Progress tab that surfaces pattern-level intelligence: trends the
user can act on, computed client-side from their existing session history. No new backend endpoints
needed for MVP.

---

## Current State

### Backend
- `GET /api/sessions?limit=100&includeSets=true` — returns sessions with sets. The `includeSets`
  param is accepted but may return sets inline. Verify by checking `session.service.ts`
  `listSessions()`: the `includeSets` flag adds a `sets` select. Use `limit=100` to get enough
  history.
- Session objects include: `startedAt`, `completedAt`, `name`, `completionScore`,
  `performanceScore`, `workoutScore`, `scoreLabel`, `sets[]` (each set has `exerciseName`,
  `actualReps`, `actualWeight`, `rpe`, `unit`).

### Frontend
- `mobile/app/(app)/progress/index.tsx` — Progress tab. Add an "Insights" button here.
- `mobile/app/(app)/progress/_layout.tsx` — Stack layout, already covers new files in `progress/`.
- `mobile/lib/theme.ts` — use `colors`, `spacing`, `radii` from here.

---

## What to Build

### 1. New hook: `mobile/hooks/useInsights.ts`

Fetches recent sessions and computes insight objects client-side.

```ts
export interface Insight {
  id: string;
  icon: string;           // Ionicons name
  iconColor: string;
  title: string;
  body: string;
  tag?: 'strength' | 'volume' | 'consistency' | 'recovery' | 'habit';
}

export function useInsights(): { insights: Insight[]; isLoading: boolean; refresh: () => void }
```

**Fetch:** `GET /api/sessions?limit=100&includeSets=true`  
**Compute** the following insights (only emit an insight if there's enough data — at least 2 sessions):

---

#### Insight A — Pressing vs Pulling strength trend
- Group sets by `movementPattern`: push exercises (bench, ohp, dip, fly) vs pull exercises (row, pullup, lat pulldown).
- Compare average max weight this month vs last month for each group.
- Emit if there's a clear imbalance (>15% gap): "Your pressing strength is improving faster than
  pulling. Consider adding a pull focus day."

**Push keyword detection** (simple string match on `exerciseName.toLowerCase()`):
`bench`, `press`, `fly`, `dip`, `push`

**Pull keyword detection:**
`row`, `pull`, `chin`, `curl`, `lat`, `face pull`, `shrug`

---

#### Insight B — Best performance day of week
- Group sessions by day of week (`new Date(startedAt).getDay()`).
- Compute average `workoutScore` (or `completionScore` fallback) per weekday.
- Emit if one day is clearly better (>1.5 point gap): "Your best sessions happen on [Day]. Try to
  schedule your hardest workouts then."

---

#### Insight C — RPE trend
- Compute average RPE across all sets per week for the last 4 weeks.
- Emit if trending up: "Your average RPE has increased over the last 4 weeks. Consider a deload."
- Emit if trending down: "Your RPE is dropping — you may be ready to increase intensity."
- Only emit if at least 3 weeks of RPE data exist.

---

#### Insight D — Workout consistency
- Count sessions per week for the last 8 weeks.
- Emit: "You've averaged X workouts/week over the last 8 weeks." — always show this one.
- If consistency is dropping (last 2 weeks below 4-week average): add "Consistency has dipped
  recently — try scheduling your next session now."

---

#### Insight E — Most skipped time of day (optional, only if data exists)
- If sessions have `startedAt` times, bucket into Morning (5–12), Afternoon (12–17), Evening (17–23).
- Emit if one bucket has significantly higher average score: "You tend to perform best in the
  [morning/evening]."

---

#### Insight F — Missed reps pattern
- Count sets where `actualReps` < a reasonable threshold for the exercise (hard to determine
  without target — use: any set where `rpe` >= 9.5 as a proxy for "near failure").
- If >20% of recent sets hit RPE 9.5+: "High RPE sets are common in your recent training.
  This can signal accumulated fatigue."

---

### 2. New component: `mobile/components/progress/InsightCard.tsx`

```tsx
interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps)
```

**Visual design:**
```
┌──────────────────────────────────────────┐
│  [icon]  Title                    [tag]  │
│                                          │
│  Body text — 2-3 sentences max.          │
└──────────────────────────────────────────┘
```

- Card background: `colors.surface`
- Left color accent: 3px left border in `insight.iconColor`
- Icon wrapped in a small colored circle (same color at 20% opacity)
- Tag pill (small, top right): `strength` → accent, `recovery` → warning, etc.
- Body text: `colors.textSecondary`, 14sp, lineHeight 20

---

### 3. New screen: `mobile/app/(app)/progress/insights.tsx`

```tsx
export default function InsightsScreen()
```

Layout:
```
Header: "Insights"  [refresh icon]
Subtitle: "Patterns from your training history"

[Loading spinner while fetching]

[InsightCard]
[InsightCard]
...

[Empty state if < 2 sessions:
  "Log at least a few workouts to unlock insights."]
```

Use a `ScrollView` with `contentContainerStyle={{ padding: 16, gap: 12 }}`.

The refresh icon in the header calls `refresh()` from `useInsights`.

---

### 4. Link from Progress tab

**File:** `mobile/app/(app)/progress/index.tsx`

Add an "Insights" button alongside the Calendar button added in Phase 7:
```tsx
<TouchableOpacity
  style={styles.insightsBtn}
  onPress={() => router.push('/(app)/progress/insights')}
>
  <Ionicons name="bulb-outline" size={18} color={'#9B5CFF'} />
  <Text style={styles.insightsBtnText}>Insights</Text>
</TouchableOpacity>
```

---

## Tag Color Reference

```ts
const TAG_COLORS = {
  strength:    theme.colors.primary,   // indigo
  volume:      '#22c55e',              // green
  consistency: '#f59e0b',              // yellow
  recovery:    '#ef4444',              // red
  habit:       '#9B5CFF',              // purple
};
```

---

## Important Notes

- **Minimum data guard:** every insight function should check `sessions.length >= 2` before emitting.
  Return an empty array from `useInsights` if there are fewer than 2 sessions — show the empty state.
- **No AI calls** in this phase. All computation is client-side JS from existing data.
- **Stale-while-revalidate:** cache results in component state; only refetch on manual pull-to-refresh
  or when the screen is focused after 5+ minutes.
- **Performance:** 100 sessions × ~15 sets each = ~1500 set objects. All array operations should
  complete in <10ms. No `useMemo` needed unless profiling shows issues.

---

## Acceptance Criteria

- [ ] Insights screen reachable from Progress tab
- [ ] At least 4 insight types computed and displayed when data exists
- [ ] Each insight has an icon, title, and body text
- [ ] Empty state shown when fewer than 2 sessions exist
- [ ] Manual refresh works
- [ ] No new backend endpoints required
