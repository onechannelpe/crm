import { operationAt } from "@tests/support/operation";
import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { BranchId, UserId } from "~/domain/ids";
import { createContactAssignmentsRuntime } from "~/server/contact-assignments/runtime";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { createLeadsBench, type LeadsBench } from "./fixtures";

describe("lead refill service benchmark", () => {
  const db = createBenchDbFixture("bench-leads-request-service");
  let branchId: BranchId;
  let seedUnit: LeadsBench["seedUnit"];
  let assignmentRuntime: ReturnType<typeof createContactAssignmentsRuntime>;
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    const leads = createLeadsBench(ctx);
    branchId = leads.branchId;
    seedUnit = leads.seedUnit;
    assignmentRuntime = createContactAssignmentsRuntime({
      executor: ctx.db,
      engine: leads.engine,
    });
  });

  beforeEach(async () => {
    userId = await seedUnit();
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: request lead refill for one user",
    async () => {
      const result = await assignmentRuntime.assign(
        { actorUserId: userId, branchId },
        operationAt(new Date()),
      );

      if (!result.ok) {
        throw new Error(
          `expected lead refill success, got ${result.error.code}`,
        );
      }
    },
    SINGLE_CALL,
  );
});
