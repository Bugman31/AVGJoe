# Mobile Testing Strategy

## Overview

The AVGJoe mobile app (React Native / Expo, located in `mobile/`) shares the same backend
API as the web frontend. This means **the existing Playwright E2E tests already cover the
full API contract** — any flow that passes on the web validates the same data layer the
mobile app consumes.

## Test Coverage By Layer

| Layer | Framework | Location | Covers |
|-------|-----------|----------|--------|
| Backend unit tests | Jest | `backend/src/__tests__/` | Services, middleware, utilities |
| Backend integration | pytest | `tests/integration/` | All REST API endpoints |
| Web E2E | Playwright | `e2e/tests/` | Full user flows via browser |
| **Mobile unit tests** | **Jest + RNTL** | **`mobile/__tests__/`** | **Components, hooks, lib, context** |

## Running Mobile Unit Tests

```bash
cd mobile
npm install
npm test                   # run once
npm run test:watch         # watch mode
npm run test:coverage      # with coverage report
```

## What the Mobile Unit Tests Cover

### `lib/`
- `auth.test.ts` — SecureStore integration: storeToken, getToken, removeToken, isTokenExpired
- `api.test.ts` — fetch wrapper: headers, Bearer injection, 401 handling, AUTH_EXPIRED callback

### `context/`
- `AuthContext.test.tsx` — initial load, session restore, login(), logout()

### `hooks/`
- `useWorkouts.test.ts` — loading state, success, error, refetch
- `useSession.test.ts` — startSession, logSet, completeSession

### `components/ui/`
- `Button.test.tsx` — renders, onPress, disabled, loading states
- `Input.test.tsx` — label, onChange, error display
- `Card.test.tsx` — renders children
- `Badge.test.tsx` — all variants

### `components/workouts/`
- `WorkoutCard.test.tsx` — renders name/meta, AI badge, navigation
- `SetRow.test.tsx` — renders targets, editable inputs, readonly mode

### `components/history/`
- `SessionCard.test.tsx` — renders name/badges/meta, navigation

## Mobile E2E (Future)

When ready for full end-to-end mobile testing, use **Detox**:
```bash
# Install Detox (macOS + Xcode required)
npm install -g detox-cli
cd mobile && npx detox build --configuration ios.sim.debug
npx detox test --configuration ios.sim.debug
```

Detox tests mirror the Playwright flows:
- Auth: login, signup
- Workouts: create, view, start session
- Session: log sets, complete workout
- AI: generate program
- Profile: update name and API key
