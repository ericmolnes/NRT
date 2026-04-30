-- Personnel document metadata and course approval workflow.
CREATE TYPE "PersonnelDocumentParserStatus" AS ENUM ('NOT_RUN', 'SUGGESTIONS_CREATED', 'NO_SUGGESTIONS', 'FAILED');
CREATE TYPE "PersonnelCourseRecordStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "PersonnelCourseRecordSource" AS ENUM ('MANUAL', 'AI');

CREATE TABLE "PersonnelDocument" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parserStatus" "PersonnelDocumentParserStatus" NOT NULL DEFAULT 'NOT_RUN',
    "parserSummary" TEXT,

    CONSTRAINT "PersonnelDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonnelCourseRecord" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "documentId" TEXT,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "certificateNumber" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "status" "PersonnelCourseRecordStatus" NOT NULL DEFAULT 'SUGGESTED',
    "source" "PersonnelCourseRecordSource" NOT NULL DEFAULT 'MANUAL',
    "aiConfidence" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedByName" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonnelCourseRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonnelDocument_personnelId_idx" ON "PersonnelDocument"("personnelId");
CREATE INDEX "PersonnelDocument_uploadedAt_idx" ON "PersonnelDocument"("uploadedAt");
CREATE INDEX "PersonnelDocument_parserStatus_idx" ON "PersonnelDocument"("parserStatus");

CREATE INDEX "PersonnelCourseRecord_personnelId_idx" ON "PersonnelCourseRecord"("personnelId");
CREATE INDEX "PersonnelCourseRecord_status_idx" ON "PersonnelCourseRecord"("status");
CREATE INDEX "PersonnelCourseRecord_expiryDate_idx" ON "PersonnelCourseRecord"("expiryDate");
CREATE INDEX "PersonnelCourseRecord_documentId_idx" ON "PersonnelCourseRecord"("documentId");

ALTER TABLE "PersonnelDocument"
  ADD CONSTRAINT "PersonnelDocument_personnelId_fkey"
  FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonnelCourseRecord"
  ADD CONSTRAINT "PersonnelCourseRecord_personnelId_fkey"
  FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonnelCourseRecord"
  ADD CONSTRAINT "PersonnelCourseRecord_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "PersonnelDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
