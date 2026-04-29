import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';

export interface Insight {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  tag?: 'strength' | 'volume' | 'consistency' | 'recovery' | 'habit';
}

interface SessionSet {
  exerciseName: string;
  actualReps: number | null;
  actualWeight: number | null;
  rpe?: number | null;
  unit: string;
}

interface InsightSession {
  id: string;
  startedAt: string;
  completedAt?: string | null;
  name: string;
  completionScore?: number | null;
  workoutScore?: number | null;
  sets?: SessionSet[];
}

const PUSH_KEYWORDS = ['bench', 'press', 'fly', 'dip', 'push'];
const PULL_KEYWORDS = ['row', 'pull', 'chin', 'curl', 'lat', 'face pull', 'shrug'];

function isPush(name: string) {
  const n = name.toLowerCase();
  return PUSH_KEYWORDS.some((k) => n.includes(k));
}
function isPull(name: string) {
  const n = name.toLowerCase();
  return PULL_KEYWORDS.some((k) => n.includes(k));
}

function startOfWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function computeInsights(sessions: InsightSession[]): Insight[] {
  const completed = sessions.filter((s) => s.completedAt);
  if (completed.length < 2) return [];

  const insights: Insight[] = [];
  const now = new Date();

  // ── A: Push vs Pull strength imbalance ──────────────────────────────────
  const thisMonth = now.getMonth();
  const lastMonth = (thisMonth + 11) % 12;
  const thisYear = now.getFullYear();
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const pushThis: number[] = [];
  const pushLast: number[] = [];
  const pullThis: number[] = [];
  const pullLast: number[] = [];

  for (const s of completed) {
    const d = new Date(s.completedAt!);
    const m = d.getMonth();
    const y = d.getFullYear();
    const isThisMonth = m === thisMonth && y === thisYear;
    const isLastMonth = m === lastMonth && y === lastMonthYear;
    if (!isThisMonth && !isLastMonth) continue;
    for (const set of s.sets ?? []) {
      if (set.actualWeight == null) continue;
      const w = set.actualWeight;
      if (isPush(set.exerciseName)) {
        if (isThisMonth) pushThis.push(w);
        else pushLast.push(w);
      } else if (isPull(set.exerciseName)) {
        if (isThisMonth) pullThis.push(w);
        else pullLast.push(w);
      }
    }
  }

  if (pushThis.length >= 3 && pushLast.length >= 3 && pullThis.length >= 3 && pullLast.length >= 3) {
    const avgPushThis = pushThis.reduce((a, b) => a + b, 0) / pushThis.length;
    const avgPushLast = pushLast.reduce((a, b) => a + b, 0) / pushLast.length;
    const avgPullThis = pullThis.reduce((a, b) => a + b, 0) / pullThis.length;
    const avgPullLast = pullLast.reduce((a, b) => a + b, 0) / pullLast.length;

    const pushGrowth = avgPushLast > 0 ? (avgPushThis - avgPushLast) / avgPushLast : 0;
    const pullGrowth = avgPullLast > 0 ? (avgPullThis - avgPullLast) / avgPullLast : 0;
    const gap = pushGrowth - pullGrowth;

    if (Math.abs(gap) > 0.15) {
      const faster = gap > 0 ? 'pressing' : 'pulling';
      const slower = gap > 0 ? 'pulling' : 'pressing';
      insights.push({
        id: 'push-pull',
        icon: 'barbell-outline',
        iconColor: '#6366f1',
        title: 'Push/Pull Balance',
        body: `Your ${faster} strength is improving faster than ${slower}. Consider adding a ${slower.replace('ing', '')} focus day to keep things balanced.`,
        tag: 'strength',
      });
    }
  }

  // ── B: Best performance day of week ─────────────────────────────────────
  const dayScores: number[][] = [[], [], [], [], [], [], []];
  for (const s of completed) {
    const score = s.workoutScore ?? s.completionScore;
    if (score == null) continue;
    const day = new Date(s.startedAt).getDay();
    dayScores[day].push(score);
  }

  const dayAvgs = dayScores.map((arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null));
  const validDays = dayAvgs.map((avg, i) => ({ avg, i })).filter((d) => d.avg != null) as { avg: number; i: number }[];

  if (validDays.length >= 3) {
    validDays.sort((a, b) => b.avg - a.avg);
    const best = validDays[0];
    const worst = validDays[validDays.length - 1];
    if (best.avg - worst.avg > 1.5) {
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        id: 'best-day',
        icon: 'calendar-outline',
        iconColor: '#22c55e',
        title: 'Peak Performance Day',
        body: `Your best sessions tend to happen on ${DAYS[best.i]}. Try scheduling your hardest workouts then for better results.`,
        tag: 'habit',
      });
    }
  }

  // ── C: RPE trend over 4 weeks ────────────────────────────────────────────
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekBuckets: number[][] = [[], [], [], []];

  for (const s of completed) {
    const msSince = now.getTime() - new Date(s.completedAt!).getTime();
    const weeksAgo = Math.floor(msSince / weekMs);
    if (weeksAgo >= 4) continue;
    for (const set of s.sets ?? []) {
      if (set.rpe != null && set.rpe > 0) {
        weekBuckets[weeksAgo].push(set.rpe);
      }
    }
  }

  const weekAvgRpe = weekBuckets.map((arr) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  );
  const validWeeks = weekAvgRpe.filter((v) => v != null);

  if (validWeeks.length >= 3) {
    // weekBuckets[0] = most recent, [3] = oldest — check if ascending over time (older → newer)
    const oldest = weekAvgRpe.find((v) => v != null)!;
    const newest = weekAvgRpe[0]!;

    if (newest - oldest > 0.5) {
      insights.push({
        id: 'rpe-trend-up',
        icon: 'trending-up-outline',
        iconColor: '#ef4444',
        title: 'Rising Fatigue',
        body: 'Your average RPE has increased over the last 4 weeks. Consider scheduling a deload week to let your body recover.',
        tag: 'recovery',
      });
    } else if (oldest - newest > 0.5) {
      insights.push({
        id: 'rpe-trend-down',
        icon: 'trending-down-outline',
        iconColor: '#22c55e',
        title: 'Ready to Push Harder',
        body: 'Your RPE has been dropping recently — your body may be adapting. Consider increasing intensity or adding load.',
        tag: 'strength',
      });
    }
  }

  // ── D: Consistency ───────────────────────────────────────────────────────
  const weekCounts: Map<number, number> = new Map();
  for (const s of completed) {
    const wk = startOfWeek(new Date(s.completedAt!));
    const msSince = now.getTime() - wk;
    if (msSince > 8 * weekMs) continue;
    weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
  }

  const allWeeks = Array.from(weekCounts.values());
  if (allWeeks.length >= 2) {
    const avg8 = allWeeks.reduce((a, b) => a + b, 0) / allWeeks.length;
    const recent2 = [0, weekMs].map((offset) => {
      const wk = startOfWeek(new Date(now.getTime() - offset));
      return weekCounts.get(wk) ?? 0;
    });
    const avg2 = (recent2[0] + recent2[1]) / 2;

    const consistencyBody =
      avg2 < avg8 - 0.5
        ? `You've averaged ${avg8.toFixed(1)} workouts/week over 8 weeks, but consistency has dipped recently. Try scheduling your next session now.`
        : `You've averaged ${avg8.toFixed(1)} workouts/week over the last 8 weeks. Keep it up!`;

    insights.push({
      id: 'consistency',
      icon: 'stats-chart-outline',
      iconColor: '#f59e0b',
      title: 'Training Consistency',
      body: consistencyBody,
      tag: 'consistency',
    });
  }

  // ── E: Best time of day ──────────────────────────────────────────────────
  const timeBuckets: { [key: string]: number[] } = { Morning: [], Afternoon: [], Evening: [] };
  for (const s of completed) {
    const score = s.workoutScore ?? s.completionScore;
    if (score == null) continue;
    const hour = new Date(s.startedAt).getHours();
    if (hour >= 5 && hour < 12) timeBuckets['Morning'].push(score);
    else if (hour >= 12 && hour < 17) timeBuckets['Afternoon'].push(score);
    else if (hour >= 17 && hour < 23) timeBuckets['Evening'].push(score);
  }

  const timeEntries = Object.entries(timeBuckets)
    .filter(([, arr]) => arr.length >= 2)
    .map(([label, arr]) => ({ label, avg: arr.reduce((a, b) => a + b, 0) / arr.length }));

  if (timeEntries.length >= 2) {
    timeEntries.sort((a, b) => b.avg - a.avg);
    const best = timeEntries[0];
    const worst = timeEntries[timeEntries.length - 1];
    if (best.avg - worst.avg > 3) {
      insights.push({
        id: 'best-time',
        icon: 'sunny-outline',
        iconColor: '#f59e0b',
        title: 'Optimal Training Time',
        body: `You tend to perform best in the ${best.label.toLowerCase()}. Scheduling workouts then could help you get more out of each session.`,
        tag: 'habit',
      });
    }
  }

  // ── F: High RPE warning ──────────────────────────────────────────────────
  const recentSets: SessionSet[] = [];
  for (const s of completed) {
    const msSince = now.getTime() - new Date(s.completedAt!).getTime();
    if (msSince > 4 * weekMs) continue;
    recentSets.push(...(s.sets ?? []));
  }

  const setsWithRpe = recentSets.filter((s) => s.rpe != null);
  const highRpeSets = setsWithRpe.filter((s) => (s.rpe ?? 0) >= 9.5);

  if (setsWithRpe.length >= 10 && highRpeSets.length / setsWithRpe.length > 0.2) {
    insights.push({
      id: 'high-rpe',
      icon: 'warning-outline',
      iconColor: '#ef4444',
      title: 'High Effort Detected',
      body: `${Math.round((highRpeSets.length / setsWithRpe.length) * 100)}% of your recent sets hit RPE 9.5+. This level of effort over time can signal accumulated fatigue — a deload may help.`,
      tag: 'recovery',
    });
  }

  return insights;
}

const STALE_MS = 5 * 60 * 1000;

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchInsights = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < STALE_MS) return;
    setIsLoading(true);
    try {
      const res = await api.get<{ sessions: InsightSession[] }>(
        '/api/sessions?limit=100&includeSets=true'
      );
      lastFetchRef.current = Date.now();
      setInsights(computeInsights(res.sessions));
    } catch {
      // silent fail — keep stale data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInsights();
    }, [fetchInsights])
  );

  const refresh = useCallback(() => fetchInsights(true), [fetchInsights]);

  return { insights, isLoading, refresh };
}
