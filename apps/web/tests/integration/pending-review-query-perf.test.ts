import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../support/test-db";

async function seedPendingReviewDataset(ctx: TestDbContext, total: number) {
    const now = Date.now();
    await ctx.db.insertInto("organizations").values({
        id: 3,
        ruc: "20100000999",
        name: "Org Perf",
        locked_branch_id: null,
        locked_at: null,
        locked_by_user_id: null,
        created_at: now,
    }).execute();

    const contacts = [] as Array<{
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
    }>;

    for (let i = 0; i < total; i++) {
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
    }
    await ctx.db.insertInto("contacts").values(contacts).execute();

    const notes = [] as Array<{
        contact_id: number;
        user_id: number;
        status: "pending_review";
        created_at: number;
        updated_at: number;
        exec_code_real: string | null;
        exec_code_tdp: string | null;
    }>;

    for (let i = 0; i < total; i++) {
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
    await ctx.db.insertInto("charge_notes").values(notes).execute();
}

describe("pending review query performance", () => {
    let ctx: TestDbContext;

    beforeEach(async () => {
        ctx = await createIsolatedTestDb("pending-review-perf");
    });

    afterEach(async () => {
        await cleanupTestDb(ctx);
    });

    it("returns branch-scoped pending queue on larger dataset", async () => {
        await seedPendingReviewDataset(ctx, 1200);

        const branch1 = await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(1);
        const branch2 = await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(2);
        const branch1Ids = new Set(branch1.map((row) => row.id));

        expect(branch1.length).toBe(600);
        expect(branch2.length).toBe(600);
        for (const row of branch2) {
            expect(branch1Ids.has(row.id)).toBe(false);
        }
    });

});
