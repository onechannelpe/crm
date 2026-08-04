import { operationAt } from "@tests/support/operation";
import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { UserId } from "~/domain/ids";
import { SearchReservationId } from "~/domain/ids";
import { executeWithUsageReservation } from "~/server/capacity/application/usage/ledger";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import { createSearchUsageReservationPorts } from "~/server/search/infrastructure/search-usage-reservation-ports";
import { Ok } from "~/shared/result";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { resetQuotaUsage, seedQuotaUser } from "./fixtures";

describe("search capacity consume service benchmark", () => {
  const db = createBenchDbFixture("bench-quota-consume-service");
  let usageReservationPorts: UsageReservationPorts<"search">;
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    usageReservationPorts = createSearchUsageReservationPorts(ctx.db);
    userId = await seedQuotaUser(ctx);
  });

  beforeEach(async () => {
    await resetQuotaUsage(db.ctx(), userId);
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: reserve and commit search usage for one user",
    async () => {
      const result = await executeWithUsageReservation(
        {
          kind: "search",
          actorUserId: userId,
          requested: 1,
          reserveReason: "direct_search",
          brand: SearchReservationId.trust,
        },
        usageReservationPorts,
        operationAt(BENCH_NOW),
        async () => Ok({ value: undefined, consumed: 1 }),
      );
      if (!result.ok) {
        throw new Error(
          `expected reserve+commit success, got ${result.error.code}`,
        );
      }
    },
    SINGLE_CALL,
  );
});
