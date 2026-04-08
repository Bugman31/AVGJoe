-- AlterTable
ALTER TABLE "SessionSet" ADD COLUMN "rpe" INTEGER;

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL DEFAULT 'general_fitness',
    "secondaryGoals" TEXT NOT NULL DEFAULT '[]',
    "experienceLevel" TEXT NOT NULL DEFAULT 'intermediate',
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "sessionDurationMins" INTEGER NOT NULL DEFAULT 60,
    "preferredSplit" TEXT NOT NULL DEFAULT 'full_body',
    "availableEquipment" TEXT NOT NULL DEFAULT '[]',
    "restrictions" TEXT NOT NULL DEFAULT '[]',
    "injuryFlags" TEXT NOT NULL DEFAULT '[]',
    "workoutEnvironment" TEXT NOT NULL DEFAULT 'commercial_gym',
    "priorityAreas" TEXT NOT NULL DEFAULT '[]',
    "programStyle" TEXT NOT NULL DEFAULT 'structured',
    "benchmarkSquat" REAL,
    "benchmarkDeadlift" REAL,
    "benchmarkBench" REAL,
    "benchmarkPress" REAL,
    "benchmarkPullups" INTEGER,
    "benchmarkMileTime" TEXT,
    "bodyweight" REAL,
    "bodyFatPercent" REAL,
    "unitSystem" TEXT NOT NULL DEFAULT 'lbs',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "aiCoachingSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalWeeks" INTEGER NOT NULL DEFAULT 4,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "weeklyStructure" TEXT NOT NULL DEFAULT '{}',
    "progressionRules" TEXT NOT NULL DEFAULT '{}',
    "aiGoalSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "warmup" TEXT NOT NULL DEFAULT '[]',
    "exercises" TEXT NOT NULL DEFAULT '[]',
    "conditioning" TEXT,
    "coachNotes" TEXT,
    "estimatedDuration" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlannedWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "adherenceScore" REAL NOT NULL DEFAULT 0,
    "fatigueLevel" INTEGER NOT NULL DEFAULT 5,
    "progressionNotes" TEXT,
    "adjustments" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "weekSummary" TEXT,
    "rawAiOutput" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyAnalysis_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "plannedWorkoutId" TEXT,
    "programId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "notes" TEXT,
    "preEnergyLevel" INTEGER,
    "postEnergyLevel" INTEGER,
    "sorenessLevel" INTEGER,
    "completionScore" REAL,
    "performanceScore" REAL,
    "aiSummary" TEXT,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutSession" ("completedAt", "id", "name", "notes", "startedAt", "templateId", "userId") SELECT "completedAt", "id", "name", "notes", "startedAt", "templateId", "userId" FROM "WorkoutSession";
DROP TABLE "WorkoutSession";
ALTER TABLE "new_WorkoutSession" RENAME TO "WorkoutSession";
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");
CREATE INDEX "WorkoutSession_userId_plannedWorkoutId_idx" ON "WorkoutSession"("userId", "plannedWorkoutId");
CREATE TABLE "new_WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiGoal" TEXT,
    "programId" TEXT,
    "weekNumber" INTEGER,
    "dayOfWeek" TEXT,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutTemplate" ("aiGoal", "createdAt", "dayOfWeek", "description", "id", "isAiGenerated", "name", "programId", "updatedAt", "userId", "weekNumber") SELECT "aiGoal", "createdAt", "dayOfWeek", "description", "id", "isAiGenerated", "name", "programId", "updatedAt", "userId", "weekNumber" FROM "WorkoutTemplate";
DROP TABLE "WorkoutTemplate";
ALTER TABLE "new_WorkoutTemplate" RENAME TO "WorkoutTemplate";
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");
CREATE INDEX "WorkoutTemplate_userId_programId_idx" ON "WorkoutTemplate"("userId", "programId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "Program_userId_status_idx" ON "Program"("userId", "status");

-- CreateIndex
CREATE INDEX "PlannedWorkout_programId_weekNumber_idx" ON "PlannedWorkout"("programId", "weekNumber");

-- CreateIndex
CREATE INDEX "PlannedWorkout_userId_scheduledDate_idx" ON "PlannedWorkout"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "WeeklyAnalysis_programId_weekNumber_idx" ON "WeeklyAnalysis"("programId", "weekNumber");
