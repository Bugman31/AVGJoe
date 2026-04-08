import { prisma } from '../utils/prisma';

export interface OnboardingData {
  primaryGoal: string;
  secondaryGoals: string[];
  experienceLevel: string;
  daysPerWeek: number;
  sessionDurationMins: number;
  preferredSplit: string;
  availableEquipment: string[];
  restrictions: string[];
  injuryFlags: string[];
  workoutEnvironment: string;
  priorityAreas: string[];
  programStyle: string;
  benchmarkSquat?: number;
  benchmarkDeadlift?: number;
  benchmarkBench?: number;
  benchmarkPress?: number;
  benchmarkPullups?: number;
  benchmarkMileTime?: string;
  bodyweight?: number;
  bodyFatPercent?: number;
  unitSystem: string;
}

export async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function saveOnboarding(userId: string, data: OnboardingData) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      primaryGoal: data.primaryGoal,
      secondaryGoals: JSON.stringify(data.secondaryGoals),
      experienceLevel: data.experienceLevel,
      daysPerWeek: data.daysPerWeek,
      sessionDurationMins: data.sessionDurationMins,
      preferredSplit: data.preferredSplit,
      availableEquipment: JSON.stringify(data.availableEquipment),
      restrictions: JSON.stringify(data.restrictions),
      injuryFlags: JSON.stringify(data.injuryFlags),
      workoutEnvironment: data.workoutEnvironment,
      priorityAreas: JSON.stringify(data.priorityAreas),
      programStyle: data.programStyle,
      benchmarkSquat: data.benchmarkSquat,
      benchmarkDeadlift: data.benchmarkDeadlift,
      benchmarkBench: data.benchmarkBench,
      benchmarkPress: data.benchmarkPress,
      benchmarkPullups: data.benchmarkPullups,
      benchmarkMileTime: data.benchmarkMileTime,
      bodyweight: data.bodyweight,
      bodyFatPercent: data.bodyFatPercent,
      unitSystem: data.unitSystem,
      onboardingCompleted: true,
    },
    update: {
      primaryGoal: data.primaryGoal,
      secondaryGoals: JSON.stringify(data.secondaryGoals),
      experienceLevel: data.experienceLevel,
      daysPerWeek: data.daysPerWeek,
      sessionDurationMins: data.sessionDurationMins,
      preferredSplit: data.preferredSplit,
      availableEquipment: JSON.stringify(data.availableEquipment),
      restrictions: JSON.stringify(data.restrictions),
      injuryFlags: JSON.stringify(data.injuryFlags),
      workoutEnvironment: data.workoutEnvironment,
      priorityAreas: JSON.stringify(data.priorityAreas),
      programStyle: data.programStyle,
      benchmarkSquat: data.benchmarkSquat,
      benchmarkDeadlift: data.benchmarkDeadlift,
      benchmarkBench: data.benchmarkBench,
      benchmarkPress: data.benchmarkPress,
      benchmarkPullups: data.benchmarkPullups,
      benchmarkMileTime: data.benchmarkMileTime,
      bodyweight: data.bodyweight,
      bodyFatPercent: data.bodyFatPercent,
      unitSystem: data.unitSystem,
      onboardingCompleted: true,
    },
  });
}

export async function updateProfile(userId: string, data: Partial<OnboardingData> & { aiCoachingSummary?: string }) {
  const updateData: Record<string, unknown> = {};

  if (data.primaryGoal !== undefined) updateData.primaryGoal = data.primaryGoal;
  if (data.secondaryGoals !== undefined) updateData.secondaryGoals = JSON.stringify(data.secondaryGoals);
  if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
  if (data.daysPerWeek !== undefined) updateData.daysPerWeek = data.daysPerWeek;
  if (data.sessionDurationMins !== undefined) updateData.sessionDurationMins = data.sessionDurationMins;
  if (data.preferredSplit !== undefined) updateData.preferredSplit = data.preferredSplit;
  if (data.availableEquipment !== undefined) updateData.availableEquipment = JSON.stringify(data.availableEquipment);
  if (data.restrictions !== undefined) updateData.restrictions = JSON.stringify(data.restrictions);
  if (data.injuryFlags !== undefined) updateData.injuryFlags = JSON.stringify(data.injuryFlags);
  if (data.workoutEnvironment !== undefined) updateData.workoutEnvironment = data.workoutEnvironment;
  if (data.priorityAreas !== undefined) updateData.priorityAreas = JSON.stringify(data.priorityAreas);
  if (data.programStyle !== undefined) updateData.programStyle = data.programStyle;
  if (data.benchmarkSquat !== undefined) updateData.benchmarkSquat = data.benchmarkSquat;
  if (data.benchmarkDeadlift !== undefined) updateData.benchmarkDeadlift = data.benchmarkDeadlift;
  if (data.benchmarkBench !== undefined) updateData.benchmarkBench = data.benchmarkBench;
  if (data.benchmarkPress !== undefined) updateData.benchmarkPress = data.benchmarkPress;
  if (data.benchmarkPullups !== undefined) updateData.benchmarkPullups = data.benchmarkPullups;
  if (data.benchmarkMileTime !== undefined) updateData.benchmarkMileTime = data.benchmarkMileTime;
  if (data.bodyweight !== undefined) updateData.bodyweight = data.bodyweight;
  if (data.bodyFatPercent !== undefined) updateData.bodyFatPercent = data.bodyFatPercent;
  if (data.unitSystem !== undefined) updateData.unitSystem = data.unitSystem;
  if (data.aiCoachingSummary !== undefined) updateData.aiCoachingSummary = data.aiCoachingSummary;

  return prisma.userProfile.update({ where: { userId }, data: updateData });
}
