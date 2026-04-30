import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPowerOfficeEmployeeSyncPlan,
  serializePowerOfficeEmployeeBase,
  type PowerOfficeEmployeeLocalShape,
} from "./employee-sync-base";
import type { POEmployeeResponse } from "./types";

function employee(overrides: Partial<POEmployeeResponse> = {}): POEmployeeResponse {
  return {
    id: 123,
    code: "E-123",
    firstName: "Base",
    lastName: "Person",
    emailAddress: "base@example.com",
    phoneNumber: "100",
    departmentCode: "BASE",
    isActive: true,
    jobTitle: "Base title",
    socialSecurityNumber: null,
    lastChanged: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

test("buildPowerOfficeEmployeeSyncPlan keeps old raw base value for conflicted fields", () => {
  const base = employee({ emailAddress: "base@example.com" });
  const local: PowerOfficeEmployeeLocalShape = {
    firstName: "Base",
    lastName: "Person",
    email: "local@example.com",
    phone: "100",
    department: "BASE",
    jobTitle: "Base title",
    isActive: true,
  };
  const remote = employee({ emailAddress: "remote@example.com" });

  const plan = buildPowerOfficeEmployeeSyncPlan({
    local,
    remote,
    baseRawJson: serializePowerOfficeEmployeeBase(base),
  });

  assert.equal(plan.diagnosis.kind, "conflict");
  assert.deepEqual(plan.safeFieldUpdates, {});

  const nextBase = JSON.parse(plan.nextBaseRawJson!);
  assert.equal(nextBase.emailAddress, "base@example.com");
});

test("buildPowerOfficeEmployeeSyncPlan advances safe remote raw fields beside a conflict", () => {
  const base = employee({
    emailAddress: "base@example.com",
    departmentCode: "BASE",
  });
  const local: PowerOfficeEmployeeLocalShape = {
    firstName: "Base",
    lastName: "Person",
    email: "local@example.com",
    phone: "100",
    department: "BASE",
    jobTitle: "Base title",
    isActive: true,
  };
  const remote = employee({
    emailAddress: "remote@example.com",
    departmentCode: "REMOTE",
  });

  const plan = buildPowerOfficeEmployeeSyncPlan({
    local,
    remote,
    baseRawJson: serializePowerOfficeEmployeeBase(base),
  });

  assert.equal(plan.diagnosis.kind, "conflict");
  assert.deepEqual(plan.safeFieldUpdates, { department: "REMOTE" });

  const nextBase = JSON.parse(plan.nextBaseRawJson!);
  assert.equal(nextBase.emailAddress, "base@example.com");
  assert.equal(nextBase.departmentCode, "REMOTE");
});

test("buildPowerOfficeEmployeeSyncPlan keeps base raw payload for local-only changes", () => {
  const base = employee({ phoneNumber: "100" });
  const local: PowerOfficeEmployeeLocalShape = {
    firstName: "Base",
    lastName: "Person",
    email: "base@example.com",
    phone: "200",
    department: "BASE",
    jobTitle: "Base title",
    isActive: true,
  };
  const remote = employee({ phoneNumber: "100" });

  const plan = buildPowerOfficeEmployeeSyncPlan({
    local,
    remote,
    baseRawJson: serializePowerOfficeEmployeeBase(base),
  });

  assert.equal(plan.diagnosis.kind, "local_only");

  const nextBase = JSON.parse(plan.nextBaseRawJson!);
  assert.equal(nextBase.phoneNumber, "100");
});
