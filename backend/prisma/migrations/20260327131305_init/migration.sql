-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "anthropicApiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiGoal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "Exercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetWeight" REAL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    CONSTRAINT "ExerciseSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "actualReps" INTEGER,
    "actualWeight" REAL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "Exercise_templateId_orderIndex_idx" ON "Exercise"("templateId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExerciseSet_exerciseId_idx" ON "ExerciseSet"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SessionSet_sessionId_idx" ON "SessionSet"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSet_exerciseId_completedAt_idx" ON "SessionSet"("exerciseId", "completedAt");
