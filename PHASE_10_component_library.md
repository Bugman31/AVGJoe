# Phase 10 — Component Library Standardization

**Status:** Not started  
**Depends on:** Phases 1–9 (this is a polish pass, safe to do last)

---

## Goal

Align the component library with the names defined in the original spec (§18) so future work
uses consistent, predictable names. This is mostly aliases and thin wrappers — no visual changes.

---

## Current State

**Existing components and their current locations:**

| Spec name | Current file | Current status |
|-----------|-------------|----------------|
| `AppCard` | `components/ui/Card.tsx` | Exists, exported as `Card` |
| `PrimaryButton` | `components/ui/Button.tsx` | Exists, use `variant="primary"` |
| `SecondaryButton` | `components/ui/Button.tsx` | Exists, use `variant="secondary"` |
| `MetricCard` | — | Does not exist |
| `RpeSelector` | `components/workouts/RpePicker.tsx` | Exists, exported as `RpePicker` |
| `RestTimerCircle` | inside `RestTimerModal.tsx` (Phase 3) | SVG arc is inline — extract |
| `AICoachCard` | `components/workouts/AICoachCard.tsx` | Exists (Phase 2) |
| `WorkoutSummaryBar` | inline in `workouts/active/[sessionId].tsx` (Phase 4) | Inline — extract |
| `ExerciseListItem` | inline in `library.tsx` | Inline — extract |
| `InsightCard` | `components/progress/InsightCard.tsx` (Phase 8) | Created in Phase 8 |
| `ProgramDayCard` | inside `program.tsx` or similar | Check and alias |
| `ProgressBar` | — | Does not exist |

---

## What to Build

### 1. `mobile/components/ui/MetricCard.tsx`

A thin card that displays a single metric — used on Dashboard, Recap, Progress screens.

```tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;          // Ionicons name
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({ label, value, subValue, icon, iconColor, style }: MetricCardProps)
```

**Visual:**
```
┌───────────────────┐
│  [icon]           │
│  12,450           │  ← value (large, bold)
│  lbs volume       │  ← label (small, muted)
│  +8% vs last week │  ← subValue (optional, success/warning color)
└───────────────────┘
```

- Background: `colors.surface`, border: `colors.border`, borderRadius: `radii.lg`
- Value: 22sp, `fontWeight: '700'`, `colors.text`
- Label: 11sp, `textTransform: 'uppercase'`, `colors.textMuted`
- SubValue: 12sp, green if starts with `+`, yellow if starts with `-`, otherwise `textSecondary`

---

### 2. `mobile/components/ui/ProgressBar.tsx`

A simple horizontal fill bar with optional label.

```tsx
interface ProgressBarProps {
  value: number;            // 0–1
  color?: string;           // default: colors.primary
  height?: number;          // default: 6
  label?: string;
  showPercent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ value, color, height = 6, label, showPercent, style }: ProgressBarProps)
```

**Visual:**
```
[label text]              [45%]    ← only if showPercent
[════════════░░░░░░░░░░]           ← filled track
```

- Track background: `colors.border`
- Fill: `color` prop (default `colors.primary`)
- Animate width change with `Animated.timing` (200ms)
- `value` clamped to `[0, 1]`

---

### 3. `mobile/components/workout/ExerciseListItem.tsx`

Extract the exercise row from `library.tsx` into a standalone component.

**Current location:** The exercise list in `mobile/app/(app)/library.tsx` renders each exercise
inline in a `FlatList` `renderItem`. Extract that render function into a component.

```tsx
interface ExerciseListItemProps {
  exercise: LibraryExercise;
  onPress: () => void;
  showMuscles?: boolean;
}

export function ExerciseListItem({ exercise, onPress, showMuscles }: ExerciseListItemProps)
```

Import `LibraryExercise` from `@/lib/exerciseLibrary`.

After creating the component, update `library.tsx` to use it instead of the inline render.

---

### 4. `mobile/components/ui/index.ts` — barrel export

Create a barrel file so consumers can import any UI primitive from one path.

```ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Spinner } from './Spinner';
export { Badge } from './Badge';
export { Skeleton } from './Skeleton';
export { SkeletonList } from './SkeletonList';
export { BrandHeader } from './BrandHeader';
export { MetricCard } from './MetricCard';      // new
export { ProgressBar } from './ProgressBar';    // new

// Spec aliases (re-export under spec names)
export { Card as AppCard } from './Card';
export { Button as PrimaryButton } from './Button';
export { Button as SecondaryButton } from './Button';
```

**Note:** The `PrimaryButton` / `SecondaryButton` re-exports are just convenience aliases —
callers should still pass `variant` prop when needed.

---

### 5. Alias for `RpeSelector`

**File:** `mobile/components/workouts/RpePicker.tsx`

Add a named re-export at the bottom:
```ts
export { RpePicker as RpeSelector } from './RpePicker';
```

Or add it to a `components/workouts/index.ts` barrel if one doesn't exist.

---

### 6. Extract `RestTimerCircle`

**File:** `mobile/components/workouts/RestTimerCircle.tsx`

The SVG arc in `RestTimerModal.tsx` (Phase 3) should be extracted into a standalone component
so it can be reused elsewhere (e.g., a mini timer in a future widget).

```tsx
interface RestTimerCircleProps {
  remaining: number;
  totalDuration: number;
  size?: number;           // default: 196 (matches RADIUS=90 + STROKE_WIDTH=8 × 2)
  strokeWidth?: number;    // default: 8
}

export function RestTimerCircle({ remaining, totalDuration, size, strokeWidth }: RestTimerCircleProps)
```

Move the `RADIUS`, `CIRCUMFERENCE`, `SIZE`, `AnimatedCircle`, arc color logic, and countdown
overlay out of `RestTimerModal.tsx` into this new file. Import and use it in `RestTimerModal.tsx`.

---

### 7. `WorkoutSummaryBar` extraction

**File:** `mobile/components/workouts/WorkoutSummaryBar.tsx`

The summary bar added in Phase 4 is currently inline JSX inside `[sessionId].tsx`.
Extract it into a component.

```tsx
interface WorkoutSummaryBarProps {
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  elapsedDisplay: string;
  restTimerActive: boolean;
  restTimerRemaining: number;
  onRestTimerPress: () => void;
}

export function WorkoutSummaryBar(props: WorkoutSummaryBarProps)
```

After creating the component, replace the inline JSX in `[sessionId].tsx` with:
```tsx
<WorkoutSummaryBar
  totalVolume={totalVolume}
  completedSets={completedSets}
  totalSets={totalSets}
  elapsedDisplay={elapsedDisplay}
  restTimerActive={restTimer.isActive}
  restTimerRemaining={restTimer.remaining}
  onRestTimerPress={() => restTimer.isActive ? setShowRestModal(true) : restTimer.start()}
/>
```

---

## Implementation Order

Do these in order — each step is independent but the barrel export (step 4) should be last:

1. `MetricCard.tsx` — new, no dependencies
2. `ProgressBar.tsx` — new, no dependencies
3. `ExerciseListItem.tsx` + update `library.tsx`
4. `RestTimerCircle.tsx` + update `RestTimerModal.tsx`
5. `WorkoutSummaryBar.tsx` + update `[sessionId].tsx`
6. `RpePicker.tsx` alias
7. `components/ui/index.ts` barrel

---

## TypeScript Check

After all extractions, run `npx tsc --noEmit` from `mobile/` and fix any new errors introduced
by the refactor. The pre-existing errors (test files, dynamic imports) should be unchanged.

---

## Acceptance Criteria

- [ ] `MetricCard` exists and accepts `label`, `value`, `subValue`, `icon` props
- [ ] `ProgressBar` exists and animates fill width
- [ ] `ExerciseListItem` extracted; `library.tsx` imports it
- [ ] `RestTimerCircle` extracted; `RestTimerModal` imports it
- [ ] `WorkoutSummaryBar` extracted; `[sessionId].tsx` imports it
- [ ] `components/ui/index.ts` barrel exports all UI primitives + spec aliases
- [ ] `npx tsc --noEmit` in `mobile/` introduces no new errors vs current baseline
