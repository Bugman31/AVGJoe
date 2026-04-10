-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "SharedProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "ratingAverage" REAL NOT NULL DEFAULT 0,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SharedProgram_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sharedProgramId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramEnrollment_sharedProgramId_fkey" FOREIGN KEY ("sharedProgramId") REFERENCES "SharedProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sharedProgramId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramRating_sharedProgramId_fkey" FOREIGN KEY ("sharedProgramId") REFERENCES "SharedProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SharedProgram_creatorId_idx" ON "SharedProgram"("creatorId");

-- CreateIndex
CREATE INDEX "SharedProgram_category_isPublished_idx" ON "SharedProgram"("category", "isPublished");

-- CreateIndex
CREATE INDEX "SharedProgram_isPublished_createdAt_idx" ON "SharedProgram"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_userId_idx" ON "ProgramEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramEnrollment_userId_sharedProgramId_key" ON "ProgramEnrollment"("userId", "sharedProgramId");

-- CreateIndex
CREATE INDEX "ProgramRating_sharedProgramId_idx" ON "ProgramRating"("sharedProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRating_userId_sharedProgramId_key" ON "ProgramRating"("userId", "sharedProgramId");
