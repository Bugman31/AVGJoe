-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN "dayOfWeek" TEXT;
ALTER TABLE "WorkoutTemplate" ADD COLUMN "programId" TEXT;
ALTER TABLE "WorkoutTemplate" ADD COLUMN "weekNumber" INTEGER;

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_programId_idx" ON "WorkoutTemplate"("userId", "programId");
