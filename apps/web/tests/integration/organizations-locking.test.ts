import { describe, expect, it } from "vitest";
import { createIsolatedTestDb, cleanupTestDb } from "../support/test-db";

describe("organization branch locking", () => {
    it("findUnlockedOrLockedToBranch isolates organizations by lock owner", async () => {
        const ctx = await createIsolatedTestDb("org-lock");
        try {
            const now = Date.now();

            await ctx.db.updateTable("organizations").set({
                locked_branch_id: 1,
                locked_at: now,
                locked_by_user_id: 1,
            }).where("id", "=", 1).execute();

            await ctx.db.updateTable("organizations").set({
                locked_branch_id: 2,
                locked_at: now,
                locked_by_user_id: 3,
            }).where("id", "=", 2).execute();

            const branch1Visible = await ctx.repos.organizations.findUnlockedOrLockedToBranch(1, 50);
            const branch2Visible = await ctx.repos.organizations.findUnlockedOrLockedToBranch(2, 50);

            expect(branch1Visible.map((x) => x.id)).toContain(1);
            expect(branch1Visible.map((x) => x.id)).not.toContain(2);
            expect(branch2Visible.map((x) => x.id)).toContain(2);
            expect(branch2Visible.map((x) => x.id)).not.toContain(1);
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("lockToBranch persists lock metadata", async () => {
        const ctx = await createIsolatedTestDb("org-lock-meta");
        try {
            await ctx.repos.organizations.lockToBranch(1, 2, 3);
            const org = await ctx.repos.organizations.findById(1);

            expect(org?.locked_branch_id).toBe(2);
            expect(org?.locked_by_user_id).toBe(3);
            expect((org?.locked_at ?? 0) > 0).toBe(true);
        } finally {
            await cleanupTestDb(ctx);
        }
    });
});
