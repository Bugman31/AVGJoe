-- AlterTable: add isSkipped to PlannedWorkout
ALTER TABLE "PlannedWorkout" ADD COLUMN "isSkipped" BOOLEAN NOT NULL DEFAULT false;
