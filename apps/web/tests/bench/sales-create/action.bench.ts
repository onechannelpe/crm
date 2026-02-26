import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedSalesCreateUsers, USER_POOL_SIZE } from "./fixtures";

describe("sales create action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-create-action");
    userIds = await seedSalesCreateUsers(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: create sales record draft",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "sales-create pool exhausted before iterations completed",
      );

      const result = await ctx!.salesRecords.createDraft({
        source: "manual",
        executiveUserId: userId,
        branchId: 1,
        leadAssignmentId: null,
        client: {
          ruc: "20100000001",
          companyName: "Org Lima",
          contactName: "Contacto Lima",
          dni: "70000001",
          phones: ["+51999999111"],
          engineMatchId: null,
          completenessScore: 75,
        },
        addresses: [
          {
            addressType: "installation",
            fullText: "Av. Demo 123",
            department: null,
            province: null,
            district: null,
            ubigeo: null,
            latitude: null,
            longitude: null,
            isPrimary: true,
          },
        ],
        products: [{ productId: 1, quantity: 1 }],
      });
      if (!result.ok) {
        throw new Error(
          `expected draft creation success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
