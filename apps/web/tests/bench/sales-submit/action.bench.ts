import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { NOTE_POOL_SIZE, seedSalesSubmitNotes } from "./fixtures";

describe("sales submit action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let noteIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-submit-action");
    noteIds = await seedSalesSubmitNotes(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: submit sale for review",
    async () => {
      const noteId = takeFromPool(
        noteIds,
        cursor,
        "sales-submit pool exhausted before iterations completed",
      );

      const result = await ctx!.sales.submit(noteId, 1);
      if (!result.ok) {
        throw new Error(`expected submit success, got ${result.error}`);
      }
    },
    fixedIterations(NOTE_POOL_SIZE),
  );
});
