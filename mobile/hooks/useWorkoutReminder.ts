/**
 * useWorkoutReminder — local push notification reminders for workouts.
 * Requires expo-notifications. In Expo Go, notifications are limited;
 * full functionality requires a native build (expo run:ios / expo run:android).
 */
import { useCallback } from 'react';

// Dynamic import so the module failing to load in Expo Go doesn't crash the app
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not available (Expo Go or test environment)
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleWorkoutReminder(
  workoutName: string,
  date: Date
): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to train! 💪',
        body: `Your ${workoutName} workout is ready.`,
        sound: true,
      },
      trigger: date,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelWorkoutReminder(identifier: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore
  }
}

export function useWorkoutReminder() {
  const schedule = useCallback(
    (workoutName: string, date: Date) => scheduleWorkoutReminder(workoutName, date),
    []
  );
  const cancel = useCallback((id: string) => cancelWorkoutReminder(id), []);
  const requestPermission = useCallback(() => requestNotificationPermission(), []);

  return { scheduleReminder: schedule, cancelReminder: cancel, requestPermission };
}
