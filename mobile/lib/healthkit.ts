/**
 * HealthKit integration for Average Joe's Workout Tracker.
 *
 * Requires a custom dev build (not Expo Go):
 *   npx expo prebuild --platform ios
 *   npx expo run:ios
 *
 * All functions degrade gracefully when HealthKit is unavailable
 * (Android, Expo Go, simulator without HealthKit).
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// react-native-health is iOS-only — dynamic require guards against Android bundling errors
let AppleHealthKit: any = null;
let HealthKitConstants: any = null;
let AppleHealthKitNativeModule: any = null;

if (Platform.OS === 'ios') {
  try {
    const mod = require('react-native-health');
    AppleHealthKit = mod.default ?? mod.AppleHealthKit ?? mod;
    HealthKitConstants = AppleHealthKit?.Constants ?? mod.HealthKitConstants;
    AppleHealthKitNativeModule = NativeModules.AppleHealthKit ?? null;
  } catch {
    // Not linked (Expo Go or Android) — all functions will no-op
  }
}

export interface HKWorkoutSample {
  id: string;
  activityName: string;
  startDate: string;
  endDate: string;
  duration: number;        // seconds
  totalEnergyBurned?: number; // kcal
  sourceName: string;      // e.g. "Apple Watch"
  isFromWatch: boolean;
}

export interface SaveWorkoutOptions {
  sessionId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalEnergyBurned?: number;
}

type LiveWorkoutMetricStatus = 'unsupported' | 'waiting' | 'live' | 'stale' | 'error';
type LiveHeartRateTrend = 'rising' | 'steady' | 'falling' | 'unknown';

export interface LiveWorkoutMetricsSnapshot {
  status: LiveWorkoutMetricStatus;
  heartRate: number | null;
  activeEnergyBurned: number | null;
  heartRateTrend: LiveHeartRateTrend;
  lastHeartRateSampleAt: string | null;
  lastEnergySampleAt: string | null;
  lastUpdatedAt: string | null;
  errorMessage?: string | null;
}

export interface StartLiveWorkoutMetricsOptions {
  startDate: Date;
  pollIntervalMs?: number;
}

type HealthStatusCode = 0 | 1 | 2;

interface HealthValueSample {
  value: number;
  startDate?: string;
  endDate?: string;
}

interface RawWorkoutSample {
  id?: string;
  activityId?: number;
  activityName?: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
  duration?: number;
  totalEnergyBurned?: number;
  calories?: number;
  sourceName?: string;
  sourceId?: string;
  device?: string;
}

const DEFAULT_LIVE_METRICS: LiveWorkoutMetricsSnapshot = {
  status: 'unsupported',
  heartRate: null,
  activeEnergyBurned: null,
  heartRateTrend: 'unknown',
  lastHeartRateSampleAt: null,
  lastEnergySampleAt: null,
  lastUpdatedAt: null,
  errorMessage: null,
};

const LIVE_METRICS_STALE_AFTER_MS = 2 * 60 * 1000;
const DEFAULT_LIVE_METRICS_POLL_MS = 15000;

/** Returns true if HealthKit is available and linked on this device. */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit !== null;
}

export interface HealthKitAccessStatus {
  isAvailable: boolean;
  canQueryAuthorizationStatus: boolean;
  workoutWriteStatus: HealthStatusCode | null;
  activeEnergyWriteStatus: HealthStatusCode | null;
  needsPermissionPrompt: boolean;
  shouldPromptSettings: boolean;
  canWriteWorkouts: boolean;
}

function getPermissionConfiguration() {
  const workoutPermission = HealthKitConstants?.Permissions?.Workout ?? 'Workout';
  const heartRatePermission = HealthKitConstants?.Permissions?.HeartRate ?? 'HeartRate';
  const activeEnergyPermission =
    HealthKitConstants?.Permissions?.ActiveEnergyBurned ?? 'ActiveEnergyBurned';
  const stepCountPermission = HealthKitConstants?.Permissions?.StepCount ?? 'StepCount';

  return {
    permissions: {
      read: [
        workoutPermission,
        heartRatePermission,
        activeEnergyPermission,
        stepCountPermission,
      ],
      write: [workoutPermission, activeEnergyPermission],
    },
  };
}

export function isLiveMetricsSupported(): boolean {
  return isHealthKitAvailable() && AppleHealthKitNativeModule != null;
}

/**
 * Requests HealthKit permissions. Should be called once on app load or
 * when the user enables HealthKit in settings.
 * Returns true if permissions were granted.
 */
export async function requestPermissions(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  return new Promise((resolve) => {
    const permissions = getPermissionConfiguration();
    AppleHealthKit.initHealthKit(permissions, (err: Error) => {
      resolve(!err);
    });
  });
}

export async function getHealthKitAccessStatus(): Promise<HealthKitAccessStatus> {
  if (!isHealthKitAvailable()) {
    return {
      isAvailable: false,
      canQueryAuthorizationStatus: false,
      workoutWriteStatus: null,
      activeEnergyWriteStatus: null,
      needsPermissionPrompt: false,
      shouldPromptSettings: false,
      canWriteWorkouts: false,
    };
  }

  if (typeof AppleHealthKit.getAuthStatus !== 'function') {
    return {
      isAvailable: true,
      canQueryAuthorizationStatus: false,
      workoutWriteStatus: null,
      activeEnergyWriteStatus: null,
      needsPermissionPrompt: false,
      shouldPromptSettings: false,
      canWriteWorkouts: false,
    };
  }

  return new Promise((resolve) => {
    AppleHealthKit.getAuthStatus(
      getPermissionConfiguration(),
      (_err: string | null, results: { permissions?: { write?: HealthStatusCode[] } } | undefined) => {
        const writeStatuses = results?.permissions?.write ?? [];
        const workoutWriteStatus = writeStatuses[0] ?? null;
        const activeEnergyWriteStatus = writeStatuses[1] ?? null;
        const hasDeniedPermission =
          workoutWriteStatus === 1 || activeEnergyWriteStatus === 1;
        const needsPermissionPrompt =
          workoutWriteStatus === 0 || activeEnergyWriteStatus === 0;

        resolve({
          isAvailable: true,
          canQueryAuthorizationStatus: true,
          workoutWriteStatus,
          activeEnergyWriteStatus,
          needsPermissionPrompt,
          shouldPromptSettings: hasDeniedPermission,
          canWriteWorkouts: workoutWriteStatus === 2,
        });
      },
    );
  });
}

/**
 * Saves a completed workout session to Apple Health.
 * Maps the session to HKWorkoutActivityTypeTraditionalStrengthTraining.
 */
export async function saveWorkout(opts: SaveWorkoutOptions): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  const durationSecs = Math.round((opts.endDate.getTime() - opts.startDate.getTime()) / 1000);
  if (durationSecs <= 0) return false;

  return new Promise((resolve) => {
    const options = {
      type: 'TraditionalStrengthTraining',
      startDate: opts.startDate.toISOString(),
      endDate: opts.endDate.toISOString(),
      duration: durationSecs,
      totalEnergyBurned: opts.totalEnergyBurned ?? 0,
      totalEnergyBurnedUnit: 'kilocalorie',
    };

    AppleHealthKit.saveWorkout(options, (err: Error) => {
      resolve(!err);
    });
  });
}

/**
 * Fetches workouts recorded in Apple Health over the past `days` days.
 * Uses the documented `getSamples({ type: 'Workout' })` API from
 * `react-native-health` and normalizes the result shape.
 */
export async function getAppleWatchWorkouts(days = 30): Promise<HKWorkoutSample[]> {
  if (!isHealthKitAvailable()) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      limit: 100,
      ascending: false,
      type: 'Workout',
    };

    const normalizeWorkoutSample = (workout: RawWorkoutSample): HKWorkoutSample | null => {
      const normalizedStartDate = workout.startDate ?? workout.start ?? null;
      const normalizedEndDate = workout.endDate ?? workout.end ?? null;
      if (!normalizedStartDate || !normalizedEndDate) return null;

      const derivedDuration = Math.max(
        0,
        Math.round((Date.parse(normalizedEndDate) - Date.parse(normalizedStartDate)) / 1000),
      );
      const sourceName = workout.sourceName ?? '';
      const device = workout.device ?? '';
      const sourceId = workout.sourceId ?? '';
      const watchHint = `${sourceName} ${device} ${sourceId}`.toLowerCase();

      return {
        id: workout.id ?? `${normalizedStartDate}-${workout.activityId ?? workout.activityName ?? 'Workout'}`,
        activityName: workout.activityName ?? 'Workout',
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        duration: workout.duration ?? derivedDuration,
        totalEnergyBurned: workout.totalEnergyBurned ?? workout.calories,
        sourceName,
        isFromWatch:
          watchHint.includes('watch') ||
          (device.length > 0 && !device.toLowerCase().includes('iphone')),
      };
    };

    const handleResults = (err: Error | string | null, results: RawWorkoutSample[] | undefined) => {
      if (err || !Array.isArray(results)) {
        resolve([]);
        return;
      }

      const samples = results
        .map(normalizeWorkoutSample)
        .filter((sample): sample is HKWorkoutSample => sample !== null)
        .sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate));

      resolve(samples);
    };

    if (typeof AppleHealthKit.getSamples === 'function') {
      AppleHealthKit.getSamples(options, handleResults);
      return;
    }

    if (typeof AppleHealthKit.getWorkouts === 'function') {
      AppleHealthKit.getWorkouts(options, handleResults);
      return;
    }

    resolve([]);
  });
}

/** Format a duration in seconds to a human-readable string like "45 min". */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getLatestSampleTimestamp(sample: HealthValueSample | undefined): string | null {
  return sample?.endDate ?? sample?.startDate ?? null;
}

function parseIsoDate(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function deriveHeartRateTrend(samples: HealthValueSample[]): LiveHeartRateTrend {
  if (samples.length < 2) return 'unknown';
  const ordered = [...samples].sort((a, b) => {
    const aTime = parseIsoDate(a.endDate ?? a.startDate ?? null) ?? 0;
    const bTime = parseIsoDate(b.endDate ?? b.startDate ?? null) ?? 0;
    return aTime - bTime;
  });
  const first = ordered[0]?.value;
  const last = ordered[ordered.length - 1]?.value;
  if (first == null || last == null) return 'unknown';
  if (last >= first + 4) return 'rising';
  if (last <= first - 4) return 'falling';
  return 'steady';
}

function inferHealthKitErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'Apple Health live data is unavailable right now.';
}

function loadHeartRateSamples(startDate: Date): Promise<HealthValueSample[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    AppleHealthKit.getHeartRateSamples(
      {
        unit: 'bpm',
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        ascending: false,
        limit: 6,
      },
      (err: unknown, results: HealthValueSample[] | undefined) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(Array.isArray(results) ? results : []);
      },
    );
  });
}

function loadActiveEnergySamples(startDate: Date): Promise<HealthValueSample[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        ascending: true,
      },
      (err: unknown, results: HealthValueSample[] | undefined) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(Array.isArray(results) ? results : []);
      },
    );
  });
}

async function readLiveWorkoutMetrics(startDate: Date): Promise<LiveWorkoutMetricsSnapshot> {
  const [heartRateSamples, activeEnergySamples] = await Promise.all([
    loadHeartRateSamples(startDate),
    loadActiveEnergySamples(startDate),
  ]);

  const sortedHeartRateSamples = [...heartRateSamples].sort((a, b) => {
    const aTime = parseIsoDate(a.endDate ?? a.startDate ?? null) ?? 0;
    const bTime = parseIsoDate(b.endDate ?? b.startDate ?? null) ?? 0;
    return aTime - bTime;
  });

  const latestHeartRate = sortedHeartRateSamples.at(-1);
  const latestEnergy = activeEnergySamples.at(-1);
  const lastHeartRateSampleAt = getLatestSampleTimestamp(latestHeartRate);
  const lastEnergySampleAt = getLatestSampleTimestamp(latestEnergy);

  const freshestSampleMs = Math.max(
    parseIsoDate(lastHeartRateSampleAt) ?? 0,
    parseIsoDate(lastEnergySampleAt) ?? 0,
  );
  const hasSamples = freshestSampleMs > 0;
  const isFresh = hasSamples && (Date.now() - freshestSampleMs) <= LIVE_METRICS_STALE_AFTER_MS;

  return {
    status: hasSamples ? (isFresh ? 'live' : 'stale') : 'waiting',
    heartRate: latestHeartRate?.value != null ? Math.round(latestHeartRate.value) : null,
    activeEnergyBurned: activeEnergySamples.length > 0
      ? Math.round(activeEnergySamples.reduce((sum, sample) => sum + (sample.value ?? 0), 0))
      : null,
    heartRateTrend: deriveHeartRateTrend(sortedHeartRateSamples),
    lastHeartRateSampleAt,
    lastEnergySampleAt,
    lastUpdatedAt: new Date().toISOString(),
    errorMessage: null,
  };
}

export function startLiveWorkoutMetrics(
  options: StartLiveWorkoutMetricsOptions,
  onUpdate: (snapshot: LiveWorkoutMetricsSnapshot) => void,
): () => void {
  if (!isLiveMetricsSupported()) {
    onUpdate({ ...DEFAULT_LIVE_METRICS });
    return () => {};
  }

  let isStopped = false;
  let isRefreshing = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const subscriptions: Array<{ remove: () => void }> = [];
  const emitter = AppleHealthKitNativeModule
    ? new NativeEventEmitter(AppleHealthKitNativeModule)
    : null;

  const emit = (snapshot: LiveWorkoutMetricsSnapshot) => {
    if (!isStopped) onUpdate(snapshot);
  };

  const refresh = async () => {
    if (isStopped || isRefreshing) return;
    isRefreshing = true;
    try {
      const snapshot = await readLiveWorkoutMetrics(options.startDate);
      emit(snapshot);
    } catch (error) {
      emit({
        ...DEFAULT_LIVE_METRICS,
        status: 'error',
        errorMessage: inferHealthKitErrorMessage(error),
        lastUpdatedAt: new Date().toISOString(),
      });
    } finally {
      isRefreshing = false;
    }
  };

  emit({
    ...DEFAULT_LIVE_METRICS,
    status: 'waiting',
    lastUpdatedAt: new Date().toISOString(),
  });

  try {
    AppleHealthKit.setObserver?.({ type: 'HeartRate' });
    if (emitter) {
      subscriptions.push(
        emitter.addListener('healthKit:HeartRate:sample', () => {
          void refresh();
        }),
      );
    }
  } catch {
    // Observer setup is best-effort. Polling still keeps the UI updated.
  }

  void refresh();
  pollTimer = setInterval(() => {
    void refresh();
  }, options.pollIntervalMs ?? DEFAULT_LIVE_METRICS_POLL_MS);

  return () => {
    isStopped = true;
    if (pollTimer) clearInterval(pollTimer);
    subscriptions.forEach((subscription) => subscription.remove());
  };
}
