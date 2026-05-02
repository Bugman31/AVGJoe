# Phase 9 — AI Coach Chat Screen

**Status:** Not started  
**Depends on:** Phase 1 (AI service pattern established)

---

## Goal

Add an in-workout AI chat screen so users can ask contextual questions during a session —
"Should I increase weight?", "Give me a sub for dips" — and get answers that reference their
actual workout data, not generic advice.

---

## Current State

### Backend
- `backend/src/services/ai.service.ts` — `callAi()` helper, `resolveAi()` for per-user API keys.
  Pattern: system prompt + user message → string response.
- `backend/src/routes/ai.routes.ts` — already has `POST /api/ai/set-feedback`. Add alongside it.
- `backend/src/controllers/ai.controller.ts` — already has `getSetFeedback`. Add `coachChat` here.
- `backend/src/services/session.service.ts` — `getSession()` returns full session with sets.
  Use this to inject workout context into the system prompt.

### Frontend
- `mobile/app/(app)/workouts/active/[sessionId].tsx` — the active workout screen. The `sessionId`
  is available via `useLocalSearchParams`. Add a chat icon button to the existing header row
  (right side, alongside the plate calculator and timer icons).
- `mobile/lib/api.ts` — `api.post<T>(url, body)` returns `T`. Use this for chat calls.
- `mobile/lib/theme.ts` — `colors`, `spacing`, `radii`.
- Route structure: `mobile/app/(app)/workouts/active/` already exists as a folder.
  The chat screen will live at `mobile/app/(app)/workouts/active/chat.tsx` with `sessionId`
  passed as a query param.

---

## What to Build

### 1. Backend: `POST /api/ai/coach-chat`

**Rate limit:** 30/hour per user (use the same `rateLimit` pattern as other AI routes).

**Request body:**
```ts
{
  sessionId: string;
  message: string;                     // max 500 chars
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;                                  // last 6 messages max
}
```

**Response:**
```ts
{ reply: string }
```

**Controller handler** (`ai.controller.ts` — add `coachChat`):

```ts
const coachChatSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(500),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1000),
  })).max(6).optional(),
});
```

**Service function** (`ai.service.ts` — add `generateCoachChat`):

```ts
export interface CoachChatInput {
  sessionId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
```

Inside the function:
1. Fetch session context: call `getSession(sessionId, userId)` from `session.service.ts`.
   Get: session name, completed sets (grouped by exercise), avg RPE, total volume, duration so far.
2. Build system prompt with context injected:

```
You are an expert strength coach inside a workout tracking app. Answer questions about the user's
CURRENT workout only. Be specific, direct, and brief (under 60 words).

Rules:
- Use the workout data below to give specific answers
- If asked for a substitution, suggest ONE exercise that uses similar muscles
- Do not give medical advice
- Do not be generic — reference their actual numbers

Current workout: {{sessionName}}
Exercises completed so far:
{{exerciseSummary}}   ← "Bench Press: 3 sets, avg 245 lbs, avg RPE 7.8"
Total volume: {{totalVolume}} lbs
Avg RPE: {{avgRpe}}
Duration: {{durationMins}} min
```

3. Pass `conversationHistory` + new user message to `callAi()`.
4. Return the reply string.

**Route** (`ai.routes.ts`):
```ts
const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `${req.ip}:${req.user?.id ?? 'anon'}:chat`,
  message: { error: 'Too many chat requests. Try again later.' },
});

router.post('/coach-chat', authMiddleware, chatRateLimiter, aiController.coachChat);
```

---

### 2. New screen: `mobile/app/(app)/workouts/active/chat.tsx`

**Navigation:** Modal presentation — use `router.push` with a modal-style route.  
**Params:** `sessionId` via `useLocalSearchParams<{ sessionId: string }>()`.

**Layout:**
```
┌──────────────────────────────────────┐
│  ← AI Coach                    [×]   │
├──────────────────────────────────────┤
│  [Context strip: session name, vol]  │
├──────────────────────────────────────┤
│                                      │
│  [Suggested prompts — horizontal]    │
│                                      │
│  ──────────── Chat ────────────      │
│                                      │
│  [message bubbles scrollable]        │
│                                      │
├──────────────────────────────────────┤
│  [TextInput]            [Send ↑]     │
└──────────────────────────────────────┘
```

**Suggested prompts** (shown until user sends first message, then hidden):
```ts
const SUGGESTED_PROMPTS = [
  "Should I increase weight?",
  "Why did my reps drop?",
  "Give me a sub for this exercise.",
  "How am I doing today?",
  "Should I stop or keep going?",
];
```

Render as a horizontal `ScrollView` of tappable chips. Tapping a chip fills the input and auto-sends.

**Message bubbles:**
- User messages: right-aligned, `colors.primary` background, white text
- Assistant messages: left-aligned, `colors.surface` background, purple left border (`#9B5CFF`),
  `colors.text` text
- Loading state: assistant bubble with animated dots (or skeleton shimmer)

**State:**
```ts
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Send handler:**
```ts
async function send(text: string) {
  if (!text.trim() || isLoading) return;
  const userMsg: Message = { role: 'user', content: text.trim() };
  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsLoading(true);

  try {
    const res = await api.post<{ reply: string }>('/api/ai/coach-chat', {
      sessionId,
      message: userMsg.content,
      conversationHistory: messages.slice(-6),   // last 6 for context
    });
    setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
  } catch {
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: "Sorry, I couldn't reach the coach right now. Try again.",
    }]);
  } finally {
    setIsLoading(false);
  }
}
```

Auto-scroll to bottom when a new message is added (use `FlatList` with `ref.scrollToEnd()`).

**Context strip** (below header, above suggested prompts):
- Fetch `GET /api/sessions/${sessionId}` on mount to get session name and set count.
- Display: `"Push Day A  ·  8 sets logged"` in a small muted bar.

---

### 3. Wire chat icon into active workout header

**File:** `mobile/app/(app)/workouts/active/[sessionId].tsx`

In the header right-side icon row (alongside the plate calc and timer icons), add:

```tsx
<TouchableOpacity
  onPress={() => router.push(`/(app)/workouts/active/chat?sessionId=${sessionId}`)}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.colors.textSecondary} />
</TouchableOpacity>
```

---

### 4. Route layout note

The `chat.tsx` screen lives inside `mobile/app/(app)/workouts/active/`. The existing
`mobile/app/(app)/workouts/_layout.tsx` Stack already covers this path — no layout changes needed.
If the screen needs modal presentation style, add `presentation: 'modal'` to the Stack.Screen
config in `_layout.tsx` for the `active/chat` route.

---

## Acceptance Criteria

- [ ] Chat icon visible in active workout header
- [ ] Tapping icon opens chat screen with session context strip
- [ ] Suggested prompts shown before first message
- [ ] Tapping a prompt fills + auto-sends it
- [ ] User and assistant messages display with distinct styles
- [ ] Loading state shows while waiting for reply
- [ ] Conversation history (last 6 messages) included in each request
- [ ] Rate limit error handled gracefully
- [ ] Backend TypeScript compiles cleanly
