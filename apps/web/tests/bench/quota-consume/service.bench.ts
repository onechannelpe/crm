import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import { executeWithUsageReservation } from "~/server/capacity/application/usage/ledger";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import { createServerInfra } from "~/server/platform/container/infra";
import { createSearchRuntime } from "~/server/platform/container/search-runtime";
import type { UserId } from "~/server/shared/ids";
import { SearchReservationId } from "~/server/shared/ids";
import { Ok } from "~/server/shared/result";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { resetQuotaUsage, seedQuotaUser } from "./fixtures";

describe("search capacity consume service benchmark", () => {
  const db = createBenchDbFixture("bench-quota-consume-service");
  let usageReservationPorts: UsageReservationPorts<"search">;
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    usageReservationPorts = createSearchRuntime(
      createServerInfra(ctx.db),
    ).usageReservationPorts;
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
