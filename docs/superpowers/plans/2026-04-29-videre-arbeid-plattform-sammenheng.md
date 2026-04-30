# Videre Arbeid Plattform Sammenheng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fullfore plattform-sammenheng etter at de kritiske review-funnene er lukket, slik at sync, tilgang, personell, skjema, varsler, AI og kursdokumenter henger trygt sammen.

**Architecture:** Arbeidet gaar videre i rekkefolge fra trygg datarygg til produktflater. Sync-konflikter maa kunne sees og loses manuelt foer AI-assistenten faar foresla eller utfore endringer. AI- og dokumentflyter skal bruke samme RBAC, notification- og change-log-spor som resten av systemet.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth v5, Neon/Postgres, Node test runner via `pnpm exec tsx --test`, existing sync/change-log/notification helpers.

---

## Current Baseline

Fikset i denne runden:

- RecMan sync action krever admin foer `syncAllRecman`.
- Public password verifier er eksplisitt public via `isPublicAuthPath`.
- `markAsRead` kan scopes til audience, og settings-action bruker scope.
- RecManCandidate har `rawJson` snapshotfelt og candidate-sync helper som hindrer safe-field overwrite ved konflikt.

Fortsatt aapent:

- UI/action for aa se og lose `SyncConflict`.
- PowerOffice rawJson/base-semantikk ved konflikt.
- Manuell E2E for Tasks 3-5.
- Task 7 AI-assistent.
- Task 8 kursdokumenter og AI-uttrekk.

---

### Task 1: Sync Conflict Resolution UI And Actions

**Files:**
- Create: `src/lib/sync/list-conflicts.ts`
- Create: `src/lib/sync/list-conflicts.test.ts`
- Create: `src/app/(authenticated)/settings/sync-conflicts/actions.ts`
- Create: `src/components/settings/sync-conflicts-panel.tsx`
- Modify: `src/app/(authenticated)/settings/page.tsx`

**Purpose:** Admin skal kunne se uavklarte sync-konflikter og velge lokal verdi, remote-verdi eller ignorere.

- [ ] Write failing tests in `src/lib/sync/list-conflicts.test.ts` for filtering `SyncConflict.status = "UNRESOLVED"` by source/model.
- [ ] Implement `listUnresolvedSyncConflicts(client, filters)` in `src/lib/sync/list-conflicts.ts`.
- [ ] Write failing action tests or source-level guard tests proving resolve/ignore actions call `assertAdmin()`.
- [ ] Implement `resolveSyncConflict(conflictId, resolution)` with admin gate, transaction, `ChangeLog`, and `SyncConflict.status = "RESOLVED"`.
- [ ] Implement `ignoreSyncConflict(conflictId)` with admin gate and audit log.
- [ ] Add `SyncConflictsPanel` to settings for admins.
- [ ] Run `pnpm exec tsx --test src/lib/sync/list-conflicts.test.ts src/lib/sync/sync-queue.test.ts`.
- [ ] Run `pnpm build`.

**Done when:** Admin can handle an unresolved conflict without direct DB access, and resolution is logged.

---

### Task 2: PowerOffice Base Snapshot Semantics

**Files:**
- Modify: `src/lib/poweroffice/sync-employees.ts`
- Create: `src/lib/poweroffice/employee-sync-base.test.ts`
- Optional create: `src/lib/poweroffice/employee-sync-base.ts`

**Purpose:** PowerOffice employee sync must not advance the base snapshot for conflicted fields.

- [ ] Write failing tests for a conflict where `rawJson` must keep the old base value for the conflicted field.
- [ ] Write failing tests for safe remote fields beside a conflict advancing in the next base.
- [ ] Extract base-merge helper if needed, mirroring `src/lib/recman/candidate-sync.ts`.
- [ ] Update `sync-employees.ts` so `rawJson` is merged per field instead of always set to latest remote payload.
- [ ] Run `pnpm exec tsx --test src/lib/poweroffice/employee-sync-base.test.ts src/lib/sync/conflict-detector.test.ts src/lib/sync/sync-queue.test.ts`.
- [ ] Run `pnpm build`.

**Done when:** Re-running sync after an unresolved conflict still reports that field as unresolved conflict, not as local-only.

---

### Task 3: Manual E2E Checklist For Tasks 3-5

**Files:**
- Create: `docs/superpowers/plans/2026-04-29-manual-e2e-checklist.md`

**Purpose:** Bekrefte at personellkategori, skjema-filter og varsler fungerer som faktisk brukerflyt.

- [ ] Document a seeded/manual setup for one ansatt, one innleid, one kandidat, one minimum user, and one admin.
- [ ] Verify personell list filters for `ANSATT`, `INNLEID`, `KANDIDAT`.
- [ ] Verify a candidate marked as innleid disappears from kandidat flow and appears as innleid.
- [ ] Verify create evaluation link with category + department filters.
- [ ] Verify public form cannot submit for a person outside filter.
- [ ] Verify access request creates admin notification and optional email path is skipped safely when SMTP is absent.
- [ ] Record exact commands, URLs, and pass/fail notes in the checklist doc.

**Done when:** A human or browser-agent can replay the checklist without reading implementation code.

---

### Task 4: AI Assistant Action Layer

**Files:**
- Create: `src/lib/assistant/resolve-user-capabilities.ts`
- Create: `src/lib/assistant/resolve-user-capabilities.test.ts`
- Create: `src/lib/assistant/run-assistant-action.ts`
- Create: `src/lib/assistant/run-assistant-action.test.ts`
- Create: `src/lib/assistant/prompts.ts`
- Modify: `src/app/(authenticated)/settings/page.tsx`
- Modify: `src/components/settings/ai-model-setting.tsx`

**Purpose:** AI skal bare kunne foresla eller kalle godkjente actions innenfor brukerens tilgangsnivaa.

- [ ] Write failing tests for `MINIMUM`, `USER`, and `ADMIN` capability resolution.
- [ ] Implement `resolveUserCapabilities(access)` with explicit allowed action IDs.
- [ ] Write failing tests proving `runAssistantAction` rejects actions outside capability set.
- [ ] Implement `runAssistantAction` as a dispatcher over approved server-side actions only.
- [ ] Persist `AiActionRun` for accepted/rejected action attempts.
- [ ] Connect admin-only AI model setting to the same access model.
- [ ] Run `pnpm exec tsx --test src/lib/assistant/resolve-user-capabilities.test.ts src/lib/assistant/run-assistant-action.test.ts`.
- [ ] Run `pnpm build`.

**Done when:** AI has no direct database write path and every action attempt is access-checked and logged.

---

### Task 5: Assistant Shell And Sync Review Panel

**Files:**
- Create: `src/app/(authenticated)/assistant/page.tsx`
- Create: `src/components/assistant/assistant-panel.tsx`
- Create: `src/components/assistant/assistant-mode-switcher.tsx`
- Create: `src/components/assistant/sync-review-panel.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Purpose:** Gi brukeren en fast assistentflate og la admins gjennomga grupperte sync-konflikter med forklaringer.

- [ ] Add route `/assistant` behind normal authenticated layout.
- [ ] Add sidebar entry visible for `USER` and `ADMIN`, hidden from `MINIMUM`.
- [ ] Build mode switcher with `Plan`, `Ask before edits`, and disabled `Auto` until action layer is proven.
- [ ] Build sync review panel reading unresolved conflicts from Task 1.
- [ ] Require explicit confirmation before calling any mutating assistant action.
- [ ] Run `pnpm build`.
- [ ] Manually verify desktop and mobile layout for `/assistant`.

**Done when:** Assistant UI exists but cannot bypass RBAC or mutate without confirmation.

---

### Task 6: Course Documents And AI Extraction

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/personell/course-records.ts`
- Create: `src/lib/personell/course-records.test.ts`
- Create: `src/lib/personell/document-parser.ts`
- Create: `src/lib/personell/document-parser.test.ts`
- Create: `src/components/personell/personnel-documents-tab.tsx`
- Modify: `src/app/(authenticated)/personell/[id]/actions.ts`
- Modify: `src/app/(authenticated)/personell/[id]/page.tsx`

**Purpose:** Alle personellkategorier skal kunne lagre dokumentasjon, og AI skal foresla kursmetadata som kan godkjennes eller avvises.

- [ ] Decide schema for personnel document metadata and AI suggestions.
- [ ] Write failing tests for normalized course suggestion output from `document-parser`.
- [ ] Implement parser contract that returns suggestions only, never direct writes.
- [ ] Write failing tests for creating, approving, correcting, and rejecting course records.
- [ ] Implement course-record helpers with `ChangeLog`.
- [ ] Add document tab to personnel profile for all categories.
- [ ] Add upload/action flow that stores file metadata even when AI extraction is unavailable.
- [ ] Run `pnpm exec tsx --test src/lib/personell/document-parser.test.ts src/lib/personell/course-records.test.ts`.
- [ ] Run `pnpm build`.

**Done when:** Documents can be stored without AI, and AI suggestions can be approved, corrected, or rejected with audit trail.

---

## Verification Before Closing The Branch

- [x] Run all local unit tests used by the plan.
- [x] Run `pnpm build`.
- [x] Run `pnpm lint`.
- [x] Run `git diff --check`.
- [x] Review `git status --short` and separate unrelated dirty files from this work.
- [x] Update the handover/evaluation doc with actual pass/fail evidence.

## Execution Status 2026-04-29

Branch/main sync:

- `origin/main` updated from local `main`: `ba8dbb3..ee16d0e`.
- `Test` / `origin/Test` is already merged into `main`.
- `codex/task3-task4-cohesion` points at the same commit as `main` before the current uncommitted plan work.
- Remaining unmerged remote branch: `origin/claude/add-claude-documentation-PuiXq` (documentation-only branch, not merged as part of this plan pass).

Verified in this pass:

- `pnpm exec tsx --test src/lib/sync/list-conflicts.test.ts src/lib/poweroffice/employee-sync-base.test.ts src/lib/assistant/resolve-user-capabilities.test.ts src/lib/assistant/run-assistant-action.test.ts src/lib/personell/document-parser.test.ts src/lib/personell/course-records.test.ts`
  - Result: 30 tests passed.
- `pnpm exec tsx --test <all src/**/*.test.ts>`
  - Earlier result: 195 tests passed.
- `pnpm build`
  - Result: Next.js production build completed successfully.
- `pnpm lint`
  - Result: exit 0 with existing warnings.
- `git diff --check`
  - Result: exit 0.

Continuation verification 2026-04-29:

- Prisma migration baseline was repaired for the existing Neon database:
  - `20260312160126_init` and `20260429100000_baseline_platform_schema` were marked applied.
  - `20260429110000_add_foundation_tables`, `20260429113000_add_recman_candidate_raw_json`, and `20260429143000_add_personnel_documents_courses` were deployed.
  - `pnpm exec prisma migrate status --config prisma.config.ts`: database schema is up to date.
- Added migration regression coverage in `src/lib/db/prisma-migrations.test.ts`.
- `pnpm exec tsx --test "src/**/*.test.ts"`
  - Result: 200 tests passed, 0 failed.
- `pnpm build`
  - Result: Next.js production build completed successfully.
- `pnpm lint`
  - Result: exit 0 with 61 existing warnings, 0 errors.
- `git diff --check`
  - Result: exit 0; only CRLF normalization warnings.
- Manual/authenticated browser E2E completed and recorded in `docs/superpowers/plans/2026-04-29-manual-e2e-checklist.md`:
  - `RUN_ID`: `20260429-codex-153106`.
  - Personell category filters for `ANSATT`, `INNLEID`, and `KANDIDAT`: PASS.
  - Candidate-to-innleid transition: PASS.
  - Evaluation link with `INNLEID` + `E2E Drift 20260429-codex-153106`: PASS.
  - Public form client-side filtering and server-side manipulated POST rejection: PASS.
  - Valid public form submission increments `usageCount`: PASS.
  - MINIMUM user waiting-access request and admin notification: PASS.
  - SMTP absence path: PASS, all SMTP vars missing and in-app request/notification still created.
- `/dashboard` and `/assistant` smoke verified with authenticated browser session.
- `/assistant` desktop and mobile layout smoke verified; no horizontal overflow in both viewports.

Remaining notes:

- Working tree remains intentionally dirty with the current plan work and earlier uncommitted files; no staging or commit was performed in this pass.
- Dev server is still listening on `http://localhost:3000` (process `29008` at verification time).
