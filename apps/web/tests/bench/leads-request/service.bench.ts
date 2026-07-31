import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { BranchId, UserId } from "~/domain/ids";
import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { createLeadsBench, type LeadsBench } from "./fixtures";

describe("lead refill service benchmark", () => {
  const db = createBenchDbFixture("bench-leads-request-service");
  let branchId: BranchId;
  let seedUnit: LeadsBench["seedUnit"];
  let assignmentContext: ReturnType<typeof createContactAssignmentsContext>;
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    const leads = createLeadsBench(ctx);
    branchId = leads.branchId;
    seedUnit = leads.seedUnit;
    assignmentContext = createContactAssignmentsContext({
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
      const result = await assignContacts(
        { actorUserId: userId, branchId },
        {
          repos: assignmentContext.repos,
          uow: assignmentContext.uow,
          engine: assignmentContext.engine,
          leadUsageReservationPorts:
            assignmentContext.leadUsageReservationPorts,
        },
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
