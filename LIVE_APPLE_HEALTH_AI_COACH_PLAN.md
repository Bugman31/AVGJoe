# Live Apple Health + AI Coach Plan

**Date:** April 30, 2026  
**Status:** Planned

## Goal

Add live Apple Health / Apple Watch workout signals to the active workout experience, then feed those signals into AI Coach so it can react to recovery and exertion in real time.

This plan is intentionally split into two phases:

- **Phase A:** show live workout metrics in the active workout screen
- **Phase B:** pass live metrics into AI Coach and make coaching responses aware of them

## Scope

### In scope for V1

- Live heart rate
- Live active energy burned
- Last sample timestamp / staleness detection
- Short recent trend summary for coach context
- Graceful fallback when HealthKit is unavailable, denied, stale, or unsupported

### Out of scope for V1

- Distance, pace, cadence, speed
- Deep Apple Watch workout session control
- Full backend persistence of raw live samples
- Post-workout analytics based on live watch data

## Product Intent

The live data should improve coaching and workout awareness without getting in the way of logging sets.

The app should:

- continue working normally when no live HealthKit data is available
- never block a workout if Apple Health is disconnected
- avoid overclaiming precision
- use live metrics for practical coaching, not medical advice

---

## Phase A

### Objective

Show live Apple Watch / Apple Health workout signals inside the active workout screen.

### Deliverables

#### 1. Mobile HealthKit live-subscription layer

Extend `mobile/lib/healthkit.ts` with a session-scoped live API, for example:

- `startLiveWorkoutMetrics(...)`
- `stopLiveWorkoutMetrics(...)`
- `isLiveMetricsSupported()`

The live API should:

- subscribe to heart rate updates
- subscribe to active energy updates
- expose current values plus timestamps
- expose enough information to determine whether samples are fresh or stale
- no-op safely on unsupported builds or platforms

#### 2. Live metrics state model

Add a small client-side model for active workout metrics, such as:

- `heartRate`
- `activeEnergyBurned`
- `lastHeartRateSampleAt`
- `lastEnergySampleAt`
- `heartRateTrend`
- `status`

Suggested statuses:

- `live`
- `waiting`
- `stale`
- `denied`
- `unavailable`

#### 3. Active workout screen integration

Update `mobile/app/(app)/workouts/active/[sessionId].tsx` to:

- start the live subscription on mount
- stop the live subscription on exit
- stop the live subscription on workout completion
- stop or pause safely when app state changes if needed

#### 4. Active workout UI

Add a compact live metrics strip near the top of the workout screen showing:

- current heart rate
- active calories
- live status

Optional V1 UI detail:

- subtle trend cue such as rising / stable / falling heart rate

#### 5. Fallback behavior

If HealthKit data is unavailable:

- do not show broken or empty metric UI
- show a muted status such as `Apple Watch data unavailable`
- keep the rest of the workout flow unchanged

### Acceptance Criteria

- In a native iOS build with Apple Health permissions granted, the active workout screen displays live heart rate and active energy updates during a workout.
- In Expo Go, Android, simulator without HealthKit, or denied-permission cases, the workout screen still works without crashing.
- Exiting or completing the workout cleans up the live subscription.

### Risks

- The current React Native HealthKit package may not fully expose the exact live query behavior we want.
- Apple Watch sample freshness may vary, so staleness handling is important.
- This must be tested in a real native iPhone + Apple Watch environment.

---

## Phase B

### Objective

Make AI Coach aware of live workout signals so responses reflect current recovery and exertion, not just logged sets.

### Deliverables

#### 1. Mobile coach payload extension

Extend the AI Coach request from:

- `sessionId`
- `message`
- `conversationHistory`

to also include a compact live metric snapshot, for example:

- `liveMetrics.currentHeartRate`
- `liveMetrics.activeEnergyBurned`
- `liveMetrics.heartRateTrend`
- `liveMetrics.lastSampleAt`
- `liveMetrics.status`

The payload should stay compact and avoid sending raw sample streams.

#### 2. Backend validation updates

Update backend request validation in `backend/src/controllers/ai.controller.ts` to accept optional live metric fields.

These fields must remain optional so older clients still work.

#### 3. Backend coach context updates

Update coach prompt-building in `backend/src/services/ai.service.ts` so the model can use:

- live heart rate
- energy burn
- freshness/staleness of the data
- short trend summary
- existing set history
- current exercise history
- RPE
- fatigue and rep-drop context

#### 4. Coaching behavior rules

The coach should use live metrics in grounded ways, such as:

- recommend longer rest when heart rate is still elevated
- suggest continuing when recovery appears strong and recent sets were manageable
- suggest holding weight when rep drop, high RPE, and poor recovery stack together
- mention when live metrics are unavailable instead of pretending they exist

The coach should not:

- present medical advice
- claim exact physiological certainty
- rely on live metrics alone when set/RPE data disagrees

#### 5. Chat UI awareness

Optionally enhance the AI Coach chat screen context strip so it can show that live watch data is connected, for example:

- `Live HR connected`
- `Watch data unavailable`

### Acceptance Criteria

- AI Coach requests include live metric context when available.
- Backend accepts the new fields without breaking older clients.
- Coach replies change appropriately when heart rate recovery looks poor vs. strong.
- When no live metrics exist, AI Coach still works using the existing workout context only.

### Risks

- Prompt quality can degrade if too much raw live data is sent.
- We need clear staleness rules so the coach does not react to outdated numbers.
- Testing should compare live-aware responses against the current baseline to avoid noisy or generic coaching.

---

## Suggested Implementation Order

1. Build the HealthKit live subscription API
2. Add active workout screen state and live metric UI
3. Validate behavior in a native iOS build with Apple Watch data
4. Extend the AI Coach mobile request payload
5. Extend backend validation and prompt-building
6. Tune coach behavior against real workout scenarios

## Test Plan

### Phase A

- Unit test client-side live metric shaping where practical
- Verify safe fallback in unsupported environments
- On-device validation:
  - iPhone native build
  - Apple Watch connected
  - live heart rate visible during an active workout
  - live energy updates visible during an active workout
  - subscription stops on exit / completion

### Phase B

- Unit test mobile request shaping for live coach payloads
- Unit test backend schema acceptance of optional live metric fields
- Unit test coach prompt assembly with:
  - good recovery
  - poor recovery
  - stale data
  - no data
- On-device validation that coach replies change when live metrics change

## Future Follow-Up

After Phase A and Phase B are stable, consider a follow-up phase to persist summarized live metrics to workout sessions so Progress, Insights, and post-workout AI analysis can use the same Apple Watch signals later.
