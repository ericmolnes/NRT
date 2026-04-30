-- Add base snapshot storage for RecMan candidate conflict detection.
ALTER TABLE "RecmanCandidate" ADD COLUMN "rawJson" TEXT;
