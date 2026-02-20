import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("pending review query performance", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("pending-query-bench");

    const now = Date.now();
    await ctx.db
      .insertInto("organizations")
      .values({
        id: 3,
        ruc: "20100000999",
        name: "Org Perf",
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
        created_at: now,
      })
      .execute();

    const contacts: Array<{
      id: number;
      organization_id: number;
      dni: string;
      name: string;
      phone_primary: string | null;
      phone_secondary: string | null;
      last_contacted_at: number | null;
      last_contacted_by_user_id: number | null;
      cooldown_until: number | null;
      created_at: number;
    }> = [];
    const notes: Array<{
      contact_id: number;
      user_id: number;
      status: "pending_review";
      created_at: number;
      updated_at: number;
      exec_code_real: string | null;
      exec_code_tdp: string | null;
    }> = [];
    for (let i = 0; i < 1200; i++) {
      contacts.push({
        id: 1000 + i,
        organization_id: 3,
        dni: `7${(1000000 + i).toString().slice(0, 7)}`,
        name: `Perf Contact ${i}`,
        phone_primary: null,
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
      });
      notes.push({
        contact_id: 1000 + i,
        user_id: i % 2 === 0 ? 1 : 3,
        status: "pending_review",
        created_at: now,
        updated_at: now,
        exec_code_real: null,
        exec_code_tdp: null,
      });
    }
    await ctx.db.insertInto("contacts").values(contacts).execute();
    await ctx.db.insertInto("charge_notes").values(notes).execute();
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench("loads branch-scoped pending queues", async () => {
    await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(1);
    await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(2);
  });
});
