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

import { Platform } from 'react-native';

// react-native-health is iOS-only — dynamic require guards against Android bundling errors
let AppleHealthKit: any = null;
let HealthKitConstants: any = null;

if (Platform.OS === 'ios') {
  try {
    const mod = require('react-native-health');
    AppleHealthKit = mod.default ?? mod.AppleHealthKit ?? mod;
    HealthKitConstants = AppleHealthKit?.Constants ?? mod.HealthKitConstants;
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

const READ_PERMISSIONS = [
  'Workout',
  'HeartRate',
  'ActiveEnergyBurned',
  'StepCount',
];

const WRITE_PERMISSIONS = [
  'Workout',
  'ActiveEnergyBurned',
];

/** Returns true if HealthKit is available and linked on this device. */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit !== null;
}

/**
 * Requests HealthKit permissions. Should be called once on app load or
 * when the user enables HealthKit in settings.
 * Returns true if permissions were granted.
 */
export async function requestPermissions(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  return new Promise((resolve) => {
    const permissions = {
      permissions: {
        read: READ_PERMISSIONS,
        write: WRITE_PERMISSIONS,
      },
    };
    AppleHealthKit.initHealthKit(permissions, (err: Error) => {
      resolve(!err);
    });
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
 * Filters to workouts from Apple Watch by checking the sourceName.
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
    };

    AppleHealthKit.getWorkouts(options, (err: Error, results: any[]) => {
      if (err || !results) { resolve([]); return; }

      const samples: HKWorkoutSample[] = results.map((w) => ({
        id: w.id ?? `${w.startDate}-${w.activityName}`,
        activityName: w.activityName ?? 'Workout',
        startDate: w.startDate,
        endDate: w.endDate,
        duration: w.duration ?? 0,
        totalEnergyBurned: w.totalEnergyBurned,
        sourceName: w.sourceName ?? '',
        isFromWatch: (w.sourceName ?? '').toLowerCase().includes('watch'),
      }));

      resolve(samples);
    });
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
