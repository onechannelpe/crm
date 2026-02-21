import { afterAll, beforeAll, bench, describe } from "vitest";

import { canTransition } from "~/server/sales/domain";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { COMPONENT_ITERATIONS } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { NOTE_POOL_SIZE, seedSalesSubmitNotes } from "./fixtures";

describe("sales submit component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let noteIds: number[] = [];
  const queryCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-submit-component");
    noteIds = await seedSalesSubmitNotes(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: evaluate sales transition rule",
    () => {
      const canSubmitDraft = canTransition("draft", "pending_review");
      const canApproveDraft = canTransition("draft", "approved");
      if (!canSubmitDraft || canApproveDraft) {
        throw new Error("unexpected sales transition result");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );

  bench(
    "component path: load active inventory lock by note",
    async () => {
      const noteId = takeFromPool(
        noteIds,
        queryCursor,
        "sales-submit query pool exhausted before iterations completed",
      );

      const lock =
        await ctx!.repos.inventory.findActiveLockByChargeNote(noteId);
      if (!lock) {
        throw new Error("expected active lock for seeded note");
      }
    },
    fixedIterations(NOTE_POOL_SIZE),
  );
});
