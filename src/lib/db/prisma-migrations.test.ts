import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const baselineMigrationPath = path.join(
  migrationsDir,
  "20260429100000_baseline_platform_schema",
  "migration.sql",
);
const foundationMigrationPath = path.join(
  migrationsDir,
  "20260429110000_add_foundation_tables",
  "migration.sql",
);
const recmanRawJsonMigrationName = "20260429113000_add_recman_candidate_raw_json";
const courseDocumentsMigrationName =
  "20260429143000_add_personnel_documents_courses";

const foundationTables = [
  "UserAccess",
  "AccessRequest",
  "SystemNotification",
  "ChangeLog",
  "ChangeLogEntry",
  "SyncConflict",
  "AiActionRun",
];

const taskSchemaPatterns = [
  /ALTER\s+TABLE\s+"RecmanCandidate"\s+ADD\s+COLUMN\s+"rawJson"\s+TEXT;/,
  /CREATE\s+TYPE\s+"PersonnelDocumentParserStatus"/,
  /CREATE\s+TYPE\s+"PersonnelCourseRecordStatus"/,
  /CREATE\s+TYPE\s+"PersonnelCourseRecordSource"/,
  /CREATE\s+TABLE\s+"PersonnelDocument"/,
  /CREATE\s+TABLE\s+"PersonnelCourseRecord"/,
];

const committedHeadDeltaPatterns = [
  /ALTER\s+TABLE\s+"EvaluationLink"[\s\S]*"categoriesFilter"\s+JSONB/,
  /ALTER\s+TABLE\s+"EvaluationLink"[\s\S]*"departmentsFilter"\s+JSONB/,
  /CREATE\s+INDEX\s+"ContractorPeriod_recmanCandidateId_endDate_idx"\s+ON\s+"ContractorPeriod"\("recmanCandidateId",\s+"endDate"\);/,
];

function extractCreateTableBlock(sql: string, tableName: string): string {
  const match = sql.match(
    new RegExp(`CREATE TABLE "${tableName}" \\([\\s\\S]*?\\n\\);`),
  );
  return match?.[0] ?? "";
}

function assertDoesNotContainTaskSchema(sql: string, migrationName: string) {
  for (const pattern of taskSchemaPatterns) {
    assert.doesNotMatch(
      sql,
      pattern,
      `${migrationName} must leave ${pattern} to later migrations`,
    );
  }
}

function migrationNames(): string[] {
  assert.ok(existsSync(migrationsDir), "prisma/migrations must exist");

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readMigrationSql(): string {
  assert.ok(existsSync(migrationsDir), "prisma/migrations must exist");

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .filter((filePath) => existsSync(filePath))
    .sort()
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
}

test("Prisma migrations include foundation tables required by authenticated layout", () => {
  const sql = readMigrationSql();

  for (const tableName of foundationTables) {
    assert.match(sql, new RegExp(`CREATE TABLE "${tableName}"`));
  }
});

test("Prisma migration directories keep baseline, foundation, and task migrations ordered", () => {
  const names = migrationNames();
  const baselineIndex = names.indexOf("20260429100000_baseline_platform_schema");
  const foundationIndex = names.indexOf("20260429110000_add_foundation_tables");
  const recmanRawJsonIndex = names.indexOf(recmanRawJsonMigrationName);
  const courseDocumentsIndex = names.indexOf(courseDocumentsMigrationName);

  assert.notEqual(baselineIndex, -1, "baseline migration must exist");
  assert.notEqual(foundationIndex, -1, "foundation migration must exist");
  assert.notEqual(recmanRawJsonIndex, -1, "RecMan rawJson migration must exist");
  assert.notEqual(courseDocumentsIndex, -1, "course document migration must exist");
  assert.ok(baselineIndex < foundationIndex, "baseline must run before foundation");
  assert.ok(
    foundationIndex < recmanRawJsonIndex,
    "foundation must run before RecMan rawJson",
  );
  assert.ok(
    recmanRawJsonIndex < courseDocumentsIndex,
    "RecMan rawJson must run before course documents",
  );
});


test("Prisma baseline migration stays before foundation tables", () => {
  assert.ok(
    existsSync(baselineMigrationPath),
    "baseline platform schema migration must exist",
  );

  const baselineSql = readFileSync(baselineMigrationPath, "utf8");
  const recmanCandidateTable = extractCreateTableBlock(
    baselineSql,
    "RecmanCandidate",
  );

  for (const tableName of foundationTables) {
    assert.doesNotMatch(
      baselineSql,
      new RegExp(`CREATE TABLE "${tableName}"`),
      `baseline migration must not create ${tableName}`,
    );
  }

  assertDoesNotContainTaskSchema(baselineSql, "baseline migration");
  assert.doesNotMatch(
    recmanCandidateTable,
    /"rawJson"/,
    "baseline RecmanCandidate table must not include rawJson",
  );
});

test("Prisma foundation migration creates foundation tables before later task migrations", () => {
  assert.ok(
    existsSync(foundationMigrationPath),
    "foundation tables migration must exist",
  );

  const foundationSql = readFileSync(foundationMigrationPath, "utf8");

  for (const tableName of foundationTables) {
    assert.match(
      foundationSql,
      new RegExp(`CREATE TABLE "${tableName}"`),
      `foundation migration must create ${tableName}`,
    );
  }

  assertDoesNotContainTaskSchema(foundationSql, "foundation migration");

  for (const pattern of committedHeadDeltaPatterns) {
    assert.match(
      foundationSql,
      pattern,
      `foundation delta migration must include committed HEAD change ${pattern}`,
    );
  }
});

test("later task migrations own RecMan rawJson and personnel course document schema", () => {
  const recmanRawJsonSql = readFileSync(
    path.join(
      migrationsDir,
      recmanRawJsonMigrationName,
      "migration.sql",
    ),
    "utf8",
  );
  const courseDocumentsSql = readFileSync(
    path.join(
      migrationsDir,
      courseDocumentsMigrationName,
      "migration.sql",
    ),
    "utf8",
  );

  assert.match(
    recmanRawJsonSql,
    taskSchemaPatterns[0],
  );
  for (const pattern of taskSchemaPatterns.slice(1)) {
    assert.match(courseDocumentsSql, pattern);
  }
});
