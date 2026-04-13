-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "anthropicApiKey" TEXT,
    "openaiApiKey" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'lbs',
    "bodyFat" DOUBLE PRECISION,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
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
    "benchmarkSquat" DOUBLE PRECISION,
    "benchmarkDeadlift" DOUBLE PRECISION,
    "benchmarkBench" DOUBLE PRECISION,
    "benchmarkPress" DOUBLE PRECISION,
    "benchmarkPullups" INTEGER,
    "benchmarkMileTime" TEXT,
    "bodyweight" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "unitSystem" TEXT NOT NULL DEFAULT 'lbs',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "aiCoachingSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalWeeks" INTEGER NOT NULL DEFAULT 4,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "weeklyStructure" TEXT NOT NULL DEFAULT '{}',
    "progressionRules" TEXT NOT NULL DEFAULT '{}',
    "aiGoalSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "warmup" TEXT NOT NULL DEFAULT '[]',
    "exercises" TEXT NOT NULL DEFAULT '[]',
    "conditioning" TEXT,
    "coachNotes" TEXT,
    "estimatedDuration" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAnalysis" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "adherenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatigueLevel" INTEGER NOT NULL DEFAULT 5,
    "progressionNotes" TEXT,
    "adjustments" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "weekSummary" TEXT,
    "rawAiOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiGoal" TEXT,
    "programId" TEXT,
    "weekNumber" INTEGER,
    "dayOfWeek" TEXT,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'kg',

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "plannedWorkoutId" TEXT,
    "programId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "preEnergyLevel" INTEGER,
    "postEnergyLevel" INTEGER,
    "sorenessLevel" INTEGER,
    "completionScore" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "aiSummary" TEXT,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "actualReps" INTEGER,
    "actualWeight" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "rpe" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedProgram" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "creatorAvatar" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "workoutPlan" TEXT NOT NULL DEFAULT '{}',
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedProgramId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedProgramId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BodyLog_userId_loggedAt_idx" ON "BodyLog"("userId", "loggedAt");

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

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_programId_idx" ON "WorkoutTemplate"("userId", "programId");

-- CreateIndex
CREATE INDEX "Exercise_templateId_orderIndex_idx" ON "Exercise"("templateId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExerciseSet_exerciseId_idx" ON "ExerciseSet"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_plannedWorkoutId_idx" ON "WorkoutSession"("userId", "plannedWorkoutId");

-- CreateIndex
CREATE INDEX "SessionSet_sessionId_idx" ON "SessionSet"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSet_exerciseId_completedAt_idx" ON "SessionSet"("exerciseId", "completedAt");

-- CreateIndex
CREATE INDEX "SharedProgram_creatorId_idx" ON "SharedProgram"("creatorId");

-- CreateIndex
CREATE INDEX "SharedProgram_category_isPublished_idx" ON "SharedProgram"("category", "isPublished");

-- CreateIndex
CREATE INDEX "SharedProgram_isPublished_createdAt_idx" ON "SharedProgram"("isPublished", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_userId_sharedProgramId_key" ON "ProgramEnrollment"("userId", "sharedProgramId");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_userId_idx" ON "ProgramEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRating_userId_sharedProgramId_key" ON "ProgramRating"("userId", "sharedProgramId");

-- CreateIndex
CREATE INDEX "ProgramRating_sharedProgramId_idx" ON "ProgramRating"("sharedProgramId");

-- AddForeignKey
ALTER TABLE "BodyLog" ADD CONSTRAINT "BodyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAnalysis" ADD CONSTRAINT "WeeklyAnalysis_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAnalysis" ADD CONSTRAINT "WeeklyAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedProgram" ADD CONSTRAINT "SharedProgram_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_sharedProgramId_fkey" FOREIGN KEY ("sharedProgramId") REFERENCES "SharedProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRating" ADD CONSTRAINT "ProgramRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRating" ADD CONSTRAINT "ProgramRating_sharedProgramId_fkey" FOREIGN KEY ("sharedProgramId") REFERENCES "SharedProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
