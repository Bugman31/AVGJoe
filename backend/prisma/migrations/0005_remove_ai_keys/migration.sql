-- Remove AI provider configuration columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "anthropicApiKey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "openaiApiKey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "aiProvider";
