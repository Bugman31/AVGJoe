# Phase 7 — Calendar Screen

**Status:** Not started  
**Depends on:** Nothing new — uses existing `GET /api/sessions` endpoint

---

## Goal

Add a monthly calendar view to the Progress tab that shows which days had completed workouts,
lets users tap a date to jump to that session, and shows a score indicator on each completed day.

---

## Current State

### Backend
- `GET /api/sessions?limit=N&offset=N` returns paginated sessions with `startedAt`, `completedAt`,
  `name`, `completionScore`, `performanceScore`, `workoutScore` (after Phase 6), `scoreLabel`.
- No date-range filter exists yet — the endpoint returns all sessions paginated.

### Frontend
- `mobile/app/(app)/progress/index.tsx` — the Progress tab. Shows session list + exercise charts.
  Has no link to a calendar view yet.
- `mobile/app/(app)/progress/[sessionId].tsx` — session detail screen (already exists).
- `mobile/app/(app)/progress/_layout.tsx` — stack layout for the progress route group.
- Navigation: tapping a session in history navigates to `/(app)/progress/${session.id}`.

---

## What to Build

### 1. Backend: add date-range filter to sessions endpoint

**File:** `backend/src/controllers/session.controller.ts` — `listSessions` handler  
**File:** `backend/src/services/session.service.ts` — `listSessions` function

Add optional `from` and `to` query params (ISO date strings). When present, filter:
```ts
where: {
  userId,
  completedAt: {
    not: null,
    gte: from ? new Date(from) : undefined,
    lte: to   ? new Date(to)   : undefined,
  },
}
```

Update the controller to parse them:
```ts
const { from, to } = req.query as { from?: string; to?: string };
```

---

### 2. New screen: `mobile/app/(app)/progress/calendar.tsx`

Full-screen calendar. No new route config needed — the `_layout.tsx` Stack already covers all
files in the `progress/` folder.

**Data fetching:**
```ts
// On mount + when month changes, fetch sessions for that month:
GET /api/sessions?from=YYYY-MM-01&to=YYYY-MM-31&limit=100
```

Parse `completedAt` dates into a `Map<string, SessionWithScore[]>` keyed by `YYYY-MM-DD`.

**UI layout:**
```
┌─────────────────────────────────┐
│  ◀  April 2026  ▶               │
│                                 │
│  Mo Tu We Th Fr Sa Su           │
│  [calendar grid]                │
│                                 │
│  ── April 14 ──                 │
│  [SessionCard for tapped date]  │
└─────────────────────────────────┘
```

**Calendar grid:**
- Build the grid manually using JS `Date` — no external calendar library needed.
- Each cell is a `TouchableOpacity` (44×44 minimum tap target).
- Today: filled circle background using `theme.colors.surface` border.
- Completed workout day: small green dot below the date number.
- Selected day: filled `theme.colors.primary` background.
- Other month days: `textMuted` color, still tappable if session exists.

**Session indicator dot colors** (use `workoutScore` from Phase 6 if available, else green):
```ts
score >= 9   → colors.success   (#22c55e)
score >= 7   → colors.primary   (accent)
score >= 5   → colors.warning   (#f59e0b)
score < 5    → colors.danger    (#ef4444)
no score     → colors.success   (default green)
```

**Selected date panel** (shown below the calendar when a date is tapped):
- If 1 session: show a compact session card with name, score label, and "View →" button that
  navigates to `/(app)/progress/${session.id}`.
- If multiple sessions: show a short list with the same compact card per session.
- If no session on that date: show nothing (or a subtle "No workout" message).

**Month navigation:** `◀` / `▶` buttons update month state and re-fetch.

---

### 3. New component: `mobile/components/progress/WorkoutCalendar.tsx`

Extract the calendar grid into a reusable component so the screen stays clean.

**Props:**
```ts
interface WorkoutCalendarProps {
  year: number;
  month: number;                           // 0-indexed (JS Date convention)
  markedDates: Map<string, { score?: number | null }>;  // keyed "YYYY-MM-DD"
  selectedDate: string | null;             // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  today: string;                           // "YYYY-MM-DD"
}
```

**Grid construction (pure JS, no library):**
```ts
function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // pad start: Monday-first (ISO week). getDay() returns 0=Sun; convert to Mon-first:
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // pad end to complete the last row (multiple of 7)
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
```

Render as a `View` with `flexDirection: 'row', flexWrap: 'wrap'`. Each cell is `width: '14.28%'`.

---

### 4. Link from Progress tab

**File:** `mobile/app/(app)/progress/index.tsx`

Add a "Calendar" shortcut button near the top of the screen (alongside any existing navigation).
A simple row button:
```tsx
<TouchableOpacity
  style={styles.calendarBtn}
  onPress={() => router.push('/(app)/progress/calendar')}
>
  <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
  <Text style={styles.calendarBtnText}>Calendar</Text>
</TouchableOpacity>
```

Position it in the header area of the progress screen alongside existing controls.

---

## Theme / Colors

Use the existing theme from `mobile/lib/theme.ts`:
- `colors.bg`, `colors.surface`, `colors.border`
- `colors.primary` (accent indigo) for selected state
- `colors.text`, `colors.textSecondary`, `colors.textMuted`
- `colors.success`, `colors.warning`, `colors.danger`

---

## Acceptance Criteria

- [ ] Calendar screen reachable from Progress tab
- [ ] Current month displays correctly with Mon–Sun headers
- [ ] Days with completed workouts show a colored dot
- [ ] Tapping a workout day shows a session card below the grid
- [ ] "View" button on the session card navigates to the existing session detail screen
- [ ] `◀` / `▶` navigation fetches the new month's sessions
- [ ] Today is visually distinguished
- [ ] No library beyond `react-native-svg` and standard RN needed
