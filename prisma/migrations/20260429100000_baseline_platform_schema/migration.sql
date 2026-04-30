-- CreateEnum
CREATE TYPE "PersonnelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormLinkType" AS ENUM ('EVALUATION', 'CUSTOM_FIELDS');

-- CreateEnum
CREATE TYPE "FormAuthMode" AS ENUM ('NONE', 'PASSWORD', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN', 'TEXTAREA');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('ELECTRICAL', 'INSTRUMENT', 'ENGINEERING');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'AI_PARSING', 'REVIEW', 'APPROVED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AllocationSource" AS ENUM ('MANUAL', 'JOB_GENERATED', 'JOB_OVERRIDDEN');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'PENDING_PUSH', 'PUSH_FAILED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TIME_LIMITED', 'ONGOING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('WORK', 'OFF', 'VACATION', 'AVSPASERING', 'COURSE');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'MATCHING', 'REVIEW', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('MATERIAL', 'SERVICE', 'EQUIPMENT', 'RENTAL');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PENDING', 'APPROVED', 'CONDITIONAL', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NonConformanceStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'ACTION_REQUIRED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CAPAStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CAPAType" AS ENUM ('CORRECTIVE', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PROCEDURE', 'WORK_INSTRUCTION', 'FORM_TEMPLATE', 'POLICY', 'RECORD', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'OBSOLETE');

-- AlterTable
ALTER TABLE "Personnel" ADD COLUMN     "department" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "entraId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "PersonnelStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "collaboration" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "competence" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "criteriaScores" JSONB,
ADD COLUMN     "hpiSafety" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "independence" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "punctuality" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "workEthic" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "EvaluationLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "formType" "FormLinkType" NOT NULL DEFAULT 'EVALUATION',
    "authMode" "FormAuthMode" NOT NULL DEFAULT 'NONE',
    "password" TEXT,
    "criteria" JSONB,
    "personnelId" TEXT,
    "personnelIds" JSONB,
    "roleFilter" TEXT,
    "categoryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "evaluationLinkId" TEXT NOT NULL,
    "evaluationId" TEXT,
    "authMethod" "FormAuthMode" NOT NULL,
    "microsoftEmail" TEXT,
    "microsoftName" TEXT,
    "microsoftEntraId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FieldCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "FieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "vatNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NOK',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL DEFAULT '0',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantityPerUnit" INTEGER NOT NULL DEFAULT 1,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "priceOre" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "discountGroup" TEXT,
    "classification" TEXT,
    "manufacturer" TEXT,
    "supplierProductId" TEXT,
    "stocked" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "priceListId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "Discipline" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NormCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkNorm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hoursPerUnit" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sizeRange" TEXT,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkNorm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "hourlyRateNOK" INTEGER NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectNumber" TEXT,
    "description" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceFileName" TEXT,
    "sourceFileUrl" TEXT,
    "sourceFileType" TEXT,
    "aiParseStatus" "AiParseStatus" NOT NULL DEFAULT 'PENDING',
    "aiRawOutput" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "rateProfileId" TEXT,
    "totalLaborHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "contingencyPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fieldEngineerPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "mobDemobCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equipmentRentalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualLaborHours" DOUBLE PRECISION,
    "actualMaterialCost" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateCable" (
    "id" TEXT NOT NULL,
    "tagNumber" TEXT,
    "cableType" TEXT NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "lengthMeters" DOUBLE PRECISION NOT NULL,
    "sizeCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "actualHours" DOUBLE PRECISION,
    "adjustmentFactor" DOUBLE PRECISION,
    "adjustmentNote" TEXT,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateCable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateEquipment" (
    "id" TEXT NOT NULL,
    "tagNumber" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "aiConfidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "actualHours" DOUBLE PRECISION,
    "adjustmentFactor" DOUBLE PRECISION,
    "adjustmentNote" TEXT,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateScopeItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "normId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'stk',
    "hoursPerUnit" DOUBLE PRECISION,
    "totalHours" DOUBLE PRECISION,
    "adjustmentFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "adjustmentNote" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'stk',
    "unitPriceNOK" DOUBLE PRECISION,
    "totalPriceNOK" DOUBLE PRECISION,
    "aiConfidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateAssumption" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualTimeEntry" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "adjustmentFactor" DOUBLE PRECISION,
    "adjustmentNote" TEXT,
    "normId" TEXT,
    "registeredById" TEXT NOT NULL,
    "registeredByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormUpdateLog" (
    "id" TEXT NOT NULL,
    "normId" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION NOT NULL,
    "newValue" DOUBLE PRECISION NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "avgActual" DOUBLE PRECISION NOT NULL,
    "stdDeviation" DOUBLE PRECISION,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "autoUpdated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormUpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLaborSummary" (
    "id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "roleCode" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "estimateId" TEXT NOT NULL,

    CONSTRAINT "EstimateLaborSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePlan" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePlanLabel" (
    "id" TEXT NOT NULL,
    "resourcePlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "category" TEXT NOT NULL DEFAULT 'client',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePlanLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePlanEntry" (
    "id" TEXT NOT NULL,
    "resourcePlanId" TEXT NOT NULL,
    "personnelId" TEXT,
    "displayName" TEXT NOT NULL,
    "crew" TEXT,
    "location" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAllocation" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "source" "AllocationSource" NOT NULL DEFAULT 'MANUAL',
    "jobAssignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerOfficeClient" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'demo',
    "applicationKey" TEXT NOT NULL,
    "subscriptionKey" TEXT NOT NULL,
    "encryptedClientKey" TEXT NOT NULL,
    "onboardedAt" TIMESTAMP(3),
    "onboardedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerOfficeClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSyncLog" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL DEFAULT 'demo-nrt',
    "resourceType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL,

    CONSTRAINT "POSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POCustomer" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL DEFAULT 'demo-nrt',
    "poId" BIGINT NOT NULL,
    "code" INTEGER,
    "name" TEXT NOT NULL,
    "organizationNumber" TEXT,
    "emailAddress" TEXT,
    "phoneNumber" TEXT,
    "contactPersonName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rawJson" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POProject" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL DEFAULT 'demo-nrt',
    "poId" BIGINT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "rawJson" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POEmployee" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL DEFAULT 'demo-nrt',
    "poId" BIGINT NOT NULL,
    "code" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rawJson" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "personnelId" TEXT,

    CONSTRAINT "POEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POInvoice" (
    "id" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL DEFAULT 'demo-nrt',
    "poId" BIGINT NOT NULL,
    "invoiceNumber" TEXT,
    "status" TEXT,
    "customerId" TEXT,
    "projectId" TEXT,
    "netAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "currencyCode" TEXT DEFAULT 'NOK',
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "rawJson" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationNumber" TEXT,
    "emailAddress" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'Norge',
    "industry" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "poCustomerId" TEXT,
    "poSyncStatus" "SyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "recmanCompanyId" TEXT,
    "recmanCompanyType" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "customerId" TEXT NOT NULL,
    "poProjectId" TEXT,
    "poSyncStatus" "SyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "recmanProjectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "projectId" TEXT NOT NULL,
    "rotationPatternId" TEXT,
    "resourcePlanLabelName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "rotationPatternId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalCycleDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationSegment" (
    "id" TEXT NOT NULL,
    "rotationPatternId" TEXT NOT NULL,
    "type" "SegmentType" NOT NULL,
    "days" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,

    CONSTRAINT "RotationSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecmanCandidate" (
    "id" TEXT NOT NULL,
    "recmanId" TEXT NOT NULL,
    "corporationId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "postalPlace" TEXT,
    "city" TEXT,
    "country" TEXT,
    "nationality" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "linkedIn" TEXT,
    "isEmployee" BOOLEAN NOT NULL DEFAULT false,
    "employeeNumber" INTEGER,
    "employeeStart" TIMESTAMP(3),
    "employeeEnd" TIMESTAMP(3),
    "isContractor" BOOLEAN NOT NULL DEFAULT false,
    "skills" JSONB,
    "education" JSONB,
    "experience" JSONB,
    "projectExperience" JSONB,
    "courses" JSONB,
    "relatives" JSONB,
    "attributes" JSONB,
    "languages" JSONB,
    "driversLicense" JSONB,
    "references" JSONB,
    "files" JSONB,
    "recmanCreated" TIMESTAMP(3),
    "recmanUpdated" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "personnelId" TEXT,

    CONSTRAINT "RecmanCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecmanSyncLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL,

    CONSTRAINT "RecmanSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPeriod" (
    "id" TEXT NOT NULL,
    "recmanCandidateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "company" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateImportBatch" (
    "id" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "matchedRows" INTEGER NOT NULL DEFAULT 0,
    "createdRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "matchResults" JSONB,
    "errorLog" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CandidateImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationNumber" TEXT,
    "type" "SupplierType" NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'Norge',
    "contactPerson" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReview" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "nextReviewDate" TIMESTAMP(3),
    "reviewedById" TEXT NOT NULL,
    "reviewedByName" TEXT NOT NULL,
    "outcome" "SupplierStatus" NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvaluation" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "projectId" TEXT,
    "period" TEXT,
    "qualityScore" INTEGER NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "priceScore" INTEGER NOT NULL,
    "hseScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "weightedTotal" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "evaluatedById" TEXT NOT NULL,
    "evaluatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformance" (
    "id" TEXT NOT NULL,
    "ncNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "status" "NonConformanceStatus" NOT NULL DEFAULT 'OPEN',
    "detectedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedDate" TIMESTAMP(3),
    "closedById" TEXT,
    "closedByName" TEXT,
    "reportedById" TEXT NOT NULL,
    "reportedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "nonConformanceId" TEXT NOT NULL,
    "type" "CAPAType" NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "CAPAStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAuditLog" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "reviewCycleMonths" INTEGER DEFAULT 12,
    "nextReviewDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "changeDescription" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "sharePointUrl" TEXT,
    "driveItemId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSupplier" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAuditLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRateLimit" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationLink_token_key" ON "EvaluationLink"("token");

-- CreateIndex
CREATE INDEX "EvaluationLink_token_idx" ON "EvaluationLink"("token");

-- CreateIndex
CREATE INDEX "EvaluationLink_personnelId_idx" ON "EvaluationLink"("personnelId");

-- CreateIndex
CREATE INDEX "EvaluationLink_categoryId_idx" ON "EvaluationLink"("categoryId");

-- CreateIndex
CREATE INDEX "FormSubmission_evaluationLinkId_idx" ON "FormSubmission"("evaluationLinkId");

-- CreateIndex
CREATE INDEX "FormSubmission_microsoftEmail_idx" ON "FormSubmission"("microsoftEmail");

-- CreateIndex
CREATE INDEX "FormSubmission_submittedAt_idx" ON "FormSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "Note_personnelId_idx" ON "Note"("personnelId");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FieldCategory_name_key" ON "FieldCategory"("name");

-- CreateIndex
CREATE INDEX "FieldCategory_order_idx" ON "FieldCategory"("order");

-- CreateIndex
CREATE INDEX "FieldDefinition_categoryId_idx" ON "FieldDefinition"("categoryId");

-- CreateIndex
CREATE INDEX "FieldDefinition_order_idx" ON "FieldDefinition"("order");

-- CreateIndex
CREATE UNIQUE INDEX "FieldDefinition_categoryId_name_key" ON "FieldDefinition"("categoryId", "name");

-- CreateIndex
CREATE INDEX "FieldValue_personnelId_idx" ON "FieldValue"("personnelId");

-- CreateIndex
CREATE INDEX "FieldValue_fieldId_idx" ON "FieldValue"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_personnelId_fieldId_key" ON "FieldValue"("personnelId", "fieldId");

-- CreateIndex
CREATE INDEX "PriceList_active_idx" ON "PriceList"("active");

-- CreateIndex
CREATE INDEX "Product_productId_idx" ON "Product"("productId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_classification_idx" ON "Product"("classification");

-- CreateIndex
CREATE INDEX "Product_priceListId_idx" ON "Product"("priceListId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_priceListId_productId_key" ON "Product"("priceListId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "NormCategory_name_key" ON "NormCategory"("name");

-- CreateIndex
CREATE INDEX "NormCategory_discipline_idx" ON "NormCategory"("discipline");

-- CreateIndex
CREATE INDEX "NormCategory_order_idx" ON "NormCategory"("order");

-- CreateIndex
CREATE INDEX "WorkNorm_categoryId_idx" ON "WorkNorm"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkNorm_categoryId_name_key" ON "WorkNorm"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RateProfile_name_key" ON "RateProfile"("name");

-- CreateIndex
CREATE INDEX "Rate_profileId_idx" ON "Rate"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_profileId_roleCode_key" ON "Rate"("profileId", "roleCode");

-- CreateIndex
CREATE INDEX "Estimate_status_idx" ON "Estimate"("status");

-- CreateIndex
CREATE INDEX "Estimate_createdById_idx" ON "Estimate"("createdById");

-- CreateIndex
CREATE INDEX "Estimate_createdAt_idx" ON "Estimate"("createdAt");

-- CreateIndex
CREATE INDEX "EstimateCable_estimateId_idx" ON "EstimateCable"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateEquipment_estimateId_idx" ON "EstimateEquipment"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateScopeItem_estimateId_idx" ON "EstimateScopeItem"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateLineItem_estimateId_idx" ON "EstimateLineItem"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateLineItem_productId_idx" ON "EstimateLineItem"("productId");

-- CreateIndex
CREATE INDEX "EstimateAssumption_estimateId_idx" ON "EstimateAssumption"("estimateId");

-- CreateIndex
CREATE INDEX "ActualTimeEntry_estimateId_idx" ON "ActualTimeEntry"("estimateId");

-- CreateIndex
CREATE INDEX "ActualTimeEntry_normId_idx" ON "ActualTimeEntry"("normId");

-- CreateIndex
CREATE INDEX "ActualTimeEntry_category_idx" ON "ActualTimeEntry"("category");

-- CreateIndex
CREATE INDEX "NormUpdateLog_normId_idx" ON "NormUpdateLog"("normId");

-- CreateIndex
CREATE INDEX "NormUpdateLog_createdAt_idx" ON "NormUpdateLog"("createdAt");

-- CreateIndex
CREATE INDEX "EstimateLaborSummary_estimateId_idx" ON "EstimateLaborSummary"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePlan_year_key" ON "ResourcePlan"("year");

-- CreateIndex
CREATE INDEX "ResourcePlan_year_idx" ON "ResourcePlan"("year");

-- CreateIndex
CREATE INDEX "ResourcePlanLabel_resourcePlanId_idx" ON "ResourcePlanLabel"("resourcePlanId");

-- CreateIndex
CREATE INDEX "ResourcePlanLabel_sortOrder_idx" ON "ResourcePlanLabel"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePlanLabel_resourcePlanId_name_key" ON "ResourcePlanLabel"("resourcePlanId", "name");

-- CreateIndex
CREATE INDEX "ResourcePlanEntry_resourcePlanId_idx" ON "ResourcePlanEntry"("resourcePlanId");

-- CreateIndex
CREATE INDEX "ResourcePlanEntry_personnelId_idx" ON "ResourcePlanEntry"("personnelId");

-- CreateIndex
CREATE INDEX "ResourcePlanEntry_crew_idx" ON "ResourcePlanEntry"("crew");

-- CreateIndex
CREATE INDEX "ResourcePlanEntry_sortOrder_idx" ON "ResourcePlanEntry"("sortOrder");

-- CreateIndex
CREATE INDEX "ResourceAllocation_entryId_idx" ON "ResourceAllocation"("entryId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_startDate_endDate_idx" ON "ResourceAllocation"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAllocation_entryId_startDate_idx" ON "ResourceAllocation"("entryId", "startDate");

-- CreateIndex
CREATE INDEX "ResourceAllocation_label_idx" ON "ResourceAllocation"("label");

-- CreateIndex
CREATE INDEX "ResourceAllocation_jobAssignmentId_idx" ON "ResourceAllocation"("jobAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PowerOfficeClient_tenantSlug_key" ON "PowerOfficeClient"("tenantSlug");

-- CreateIndex
CREATE INDEX "PowerOfficeClient_isActive_idx" ON "PowerOfficeClient"("isActive");

-- CreateIndex
CREATE INDEX "POSyncLog_tenantSlug_idx" ON "POSyncLog"("tenantSlug");

-- CreateIndex
CREATE INDEX "POSyncLog_resourceType_idx" ON "POSyncLog"("resourceType");

-- CreateIndex
CREATE INDEX "POSyncLog_status_idx" ON "POSyncLog"("status");

-- CreateIndex
CREATE INDEX "POSyncLog_startedAt_idx" ON "POSyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "POCustomer_tenantSlug_idx" ON "POCustomer"("tenantSlug");

-- CreateIndex
CREATE INDEX "POCustomer_name_idx" ON "POCustomer"("name");

-- CreateIndex
CREATE INDEX "POCustomer_code_idx" ON "POCustomer"("code");

-- CreateIndex
CREATE INDEX "POCustomer_lastSyncedAt_idx" ON "POCustomer"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "POCustomer_tenantSlug_poId_key" ON "POCustomer"("tenantSlug", "poId");

-- CreateIndex
CREATE INDEX "POProject_tenantSlug_idx" ON "POProject"("tenantSlug");

-- CreateIndex
CREATE INDEX "POProject_name_idx" ON "POProject"("name");

-- CreateIndex
CREATE INDEX "POProject_code_idx" ON "POProject"("code");

-- CreateIndex
CREATE INDEX "POProject_customerId_idx" ON "POProject"("customerId");

-- CreateIndex
CREATE INDEX "POProject_lastSyncedAt_idx" ON "POProject"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "POProject_tenantSlug_poId_key" ON "POProject"("tenantSlug", "poId");

-- CreateIndex
CREATE UNIQUE INDEX "POEmployee_personnelId_key" ON "POEmployee"("personnelId");

-- CreateIndex
CREATE INDEX "POEmployee_tenantSlug_idx" ON "POEmployee"("tenantSlug");

-- CreateIndex
CREATE INDEX "POEmployee_lastName_idx" ON "POEmployee"("lastName");

-- CreateIndex
CREATE INDEX "POEmployee_email_idx" ON "POEmployee"("email");

-- CreateIndex
CREATE INDEX "POEmployee_lastSyncedAt_idx" ON "POEmployee"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "POEmployee_tenantSlug_poId_key" ON "POEmployee"("tenantSlug", "poId");

-- CreateIndex
CREATE INDEX "POInvoice_tenantSlug_idx" ON "POInvoice"("tenantSlug");

-- CreateIndex
CREATE INDEX "POInvoice_invoiceNumber_idx" ON "POInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "POInvoice_customerId_idx" ON "POInvoice"("customerId");

-- CreateIndex
CREATE INDEX "POInvoice_projectId_idx" ON "POInvoice"("projectId");

-- CreateIndex
CREATE INDEX "POInvoice_status_idx" ON "POInvoice"("status");

-- CreateIndex
CREATE INDEX "POInvoice_lastSyncedAt_idx" ON "POInvoice"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "POInvoice_tenantSlug_poId_key" ON "POInvoice"("tenantSlug", "poId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTemplate_name_key" ON "EvaluationTemplate"("name");

-- CreateIndex
CREATE INDEX "EvaluationTemplate_name_idx" ON "EvaluationTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_poCustomerId_key" ON "Customer"("poCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_recmanCompanyId_key" ON "Customer"("recmanCompanyId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_poCustomerId_idx" ON "Customer"("poCustomerId");

-- CreateIndex
CREATE INDEX "Customer_recmanCompanyId_idx" ON "Customer"("recmanCompanyId");

-- CreateIndex
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_poProjectId_key" ON "Project"("poProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_recmanProjectId_key" ON "Project"("recmanProjectId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_poProjectId_idx" ON "Project"("poProjectId");

-- CreateIndex
CREATE INDEX "Project_recmanProjectId_idx" ON "Project"("recmanProjectId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_startDate_endDate_idx" ON "Job"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Job_resourcePlanLabelName_idx" ON "Job"("resourcePlanLabelName");

-- CreateIndex
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "JobAssignment_personnelId_idx" ON "JobAssignment"("personnelId");

-- CreateIndex
CREATE INDEX "JobAssignment_isActive_idx" ON "JobAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_jobId_personnelId_key" ON "JobAssignment"("jobId", "personnelId");

-- CreateIndex
CREATE UNIQUE INDEX "RotationPattern_name_key" ON "RotationPattern"("name");

-- CreateIndex
CREATE INDEX "RotationPattern_isActive_idx" ON "RotationPattern"("isActive");

-- CreateIndex
CREATE INDEX "RotationSegment_rotationPatternId_idx" ON "RotationSegment"("rotationPatternId");

-- CreateIndex
CREATE INDEX "RotationSegment_sortOrder_idx" ON "RotationSegment"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RecmanCandidate_recmanId_key" ON "RecmanCandidate"("recmanId");

-- CreateIndex
CREATE UNIQUE INDEX "RecmanCandidate_personnelId_key" ON "RecmanCandidate"("personnelId");

-- CreateIndex
CREATE INDEX "RecmanCandidate_email_idx" ON "RecmanCandidate"("email");

-- CreateIndex
CREATE INDEX "RecmanCandidate_lastName_idx" ON "RecmanCandidate"("lastName");

-- CreateIndex
CREATE INDEX "RecmanCandidate_isEmployee_idx" ON "RecmanCandidate"("isEmployee");

-- CreateIndex
CREATE INDEX "RecmanCandidate_isContractor_idx" ON "RecmanCandidate"("isContractor");

-- CreateIndex
CREATE INDEX "RecmanCandidate_title_idx" ON "RecmanCandidate"("title");

-- CreateIndex
CREATE INDEX "RecmanCandidate_lastSyncedAt_idx" ON "RecmanCandidate"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "RecmanSyncLog_status_idx" ON "RecmanSyncLog"("status");

-- CreateIndex
CREATE INDEX "RecmanSyncLog_startedAt_idx" ON "RecmanSyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "ContractorPeriod_recmanCandidateId_idx" ON "ContractorPeriod"("recmanCandidateId");

-- CreateIndex
CREATE INDEX "CandidateImportBatch_status_idx" ON "CandidateImportBatch"("status");

-- CreateIndex
CREATE INDEX "CandidateImportBatch_createdAt_idx" ON "CandidateImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_type_idx" ON "Supplier"("type");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_customerId_idx" ON "Supplier"("customerId");

-- CreateIndex
CREATE INDEX "Supplier_expiresAt_idx" ON "Supplier"("expiresAt");

-- CreateIndex
CREATE INDEX "SupplierReview_supplierId_idx" ON "SupplierReview"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierReview_reviewDate_idx" ON "SupplierReview"("reviewDate");

-- CreateIndex
CREATE INDEX "SupplierReview_nextReviewDate_idx" ON "SupplierReview"("nextReviewDate");

-- CreateIndex
CREATE INDEX "SupplierEvaluation_supplierId_idx" ON "SupplierEvaluation"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierEvaluation_createdAt_idx" ON "SupplierEvaluation"("createdAt");

-- CreateIndex
CREATE INDEX "SupplierEvaluation_projectId_idx" ON "SupplierEvaluation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformance_ncNumber_key" ON "NonConformance"("ncNumber");

-- CreateIndex
CREATE INDEX "NonConformance_supplierId_idx" ON "NonConformance"("supplierId");

-- CreateIndex
CREATE INDEX "NonConformance_status_idx" ON "NonConformance"("status");

-- CreateIndex
CREATE INDEX "NonConformance_ncNumber_idx" ON "NonConformance"("ncNumber");

-- CreateIndex
CREATE INDEX "NonConformance_detectedDate_idx" ON "NonConformance"("detectedDate");

-- CreateIndex
CREATE INDEX "CorrectiveAction_nonConformanceId_idx" ON "CorrectiveAction"("nonConformanceId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");

-- CreateIndex
CREATE INDEX "CorrectiveAction_dueDate_idx" ON "CorrectiveAction"("dueDate");

-- CreateIndex
CREATE INDEX "SupplierAuditLog_supplierId_idx" ON "SupplierAuditLog"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierAuditLog_createdAt_idx" ON "SupplierAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_docNumber_key" ON "Document"("docNumber");

-- CreateIndex
CREATE INDEX "Document_docNumber_idx" ON "Document"("docNumber");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_responsibleId_idx" ON "Document"("responsibleId");

-- CreateIndex
CREATE INDEX "Document_nextReviewDate_idx" ON "Document"("nextReviewDate");

-- CreateIndex
CREATE INDEX "Document_isActive_idx" ON "Document"("isActive");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_status_idx" ON "DocumentVersion"("status");

-- CreateIndex
CREATE INDEX "DocumentVersion_isCurrent_idx" ON "DocumentVersion"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentSupplier_documentId_idx" ON "DocumentSupplier"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSupplier_supplierId_idx" ON "DocumentSupplier"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSupplier_documentId_supplierId_key" ON "DocumentSupplier"("documentId", "supplierId");

-- CreateIndex
CREATE INDEX "DocumentAuditLog_documentId_idx" ON "DocumentAuditLog"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAuditLog_createdAt_idx" ON "DocumentAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRateLimit_service_date_idx" ON "ApiRateLimit"("service", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiRateLimit_service_date_key" ON "ApiRateLimit"("service", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_entraId_key" ON "Personnel"("entraId");

-- CreateIndex
CREATE INDEX "Personnel_entraId_idx" ON "Personnel"("entraId");

-- CreateIndex
CREATE INDEX "Personnel_status_idx" ON "Personnel"("status");

-- AddForeignKey
ALTER TABLE "EvaluationLink" ADD CONSTRAINT "EvaluationLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FieldCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationLink" ADD CONSTRAINT "EvaluationLink_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_evaluationLinkId_fkey" FOREIGN KEY ("evaluationLinkId") REFERENCES "EvaluationLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDefinition" ADD CONSTRAINT "FieldDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FieldCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkNorm" ADD CONSTRAINT "WorkNorm_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NormCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_rateProfileId_fkey" FOREIGN KEY ("rateProfileId") REFERENCES "RateProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateCable" ADD CONSTRAINT "EstimateCable_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEquipment" ADD CONSTRAINT "EstimateEquipment_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateScopeItem" ADD CONSTRAINT "EstimateScopeItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateAssumption" ADD CONSTRAINT "EstimateAssumption_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualTimeEntry" ADD CONSTRAINT "ActualTimeEntry_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLaborSummary" ADD CONSTRAINT "EstimateLaborSummary_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePlanLabel" ADD CONSTRAINT "ResourcePlanLabel_resourcePlanId_fkey" FOREIGN KEY ("resourcePlanId") REFERENCES "ResourcePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePlanEntry" ADD CONSTRAINT "ResourcePlanEntry_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePlanEntry" ADD CONSTRAINT "ResourcePlanEntry_resourcePlanId_fkey" FOREIGN KEY ("resourcePlanId") REFERENCES "ResourcePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ResourcePlanEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_jobAssignmentId_fkey" FOREIGN KEY ("jobAssignmentId") REFERENCES "JobAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POProject" ADD CONSTRAINT "POProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "POCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POEmployee" ADD CONSTRAINT "POEmployee_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POInvoice" ADD CONSTRAINT "POInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "POCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POInvoice" ADD CONSTRAINT "POInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "POProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_poCustomerId_fkey" FOREIGN KEY ("poCustomerId") REFERENCES "POCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_poProjectId_fkey" FOREIGN KEY ("poProjectId") REFERENCES "POProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "RotationPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "RotationPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationSegment" ADD CONSTRAINT "RotationSegment_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "RotationPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecmanCandidate" ADD CONSTRAINT "RecmanCandidate_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPeriod" ADD CONSTRAINT "ContractorPeriod_recmanCandidateId_fkey" FOREIGN KEY ("recmanCandidateId") REFERENCES "RecmanCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierReview" ADD CONSTRAINT "SupplierReview_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_nonConformanceId_fkey" FOREIGN KEY ("nonConformanceId") REFERENCES "NonConformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAuditLog" ADD CONSTRAINT "SupplierAuditLog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSupplier" ADD CONSTRAINT "DocumentSupplier_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSupplier" ADD CONSTRAINT "DocumentSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
