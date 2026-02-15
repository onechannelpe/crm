import { describe, expect, it } from "vitest";
import { getPermissions, type Permission, type Role } from "../../src/lib/auth/rbac";
import { createQuotaService } from "../../src/server/quota/service";
import { createIsolatedTestDb, cleanupTestDb, type TestDbContext } from "../support/test-db";
import {
    PERMISSION_MANIFEST,
    QUOTA_ERROR_MANIFEST,
    SALES_ERROR_MANIFEST,
} from "../support/security-manifests";

async function prepareSubmittableNote(ctx: TestDbContext) {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
    await ctx.repos.documents.create({
        charge_note_id: noteId,
        filename: "dni.pdf",
        filepath: `uploads/${noteId}/dni.pdf`,
        mimetype: "application/pdf",
        size: 120_000,
    });

    await ctx.db.insertInto("inventory_items").values({
        id: 1,
        product_id: 1,
        serial_number: "SN-MANIFEST-001",
        status: "available",
        created_at: Date.now(),
    }).execute();

    const reserved = await ctx.repos.inventory.reserveIfAvailable(1);
    expect(reserved).toBe(true);
    await ctx.repos.inventory.createLock(1, noteId, Date.now() + 60_000);
    return noteId;
}

describe("security invariant manifest", () => {
    const today = () => new Date().toISOString().slice(0, 10);

    it("enforces exact RBAC permission manifest", () => {
        for (const [role, expected] of Object.entries(PERMISSION_MANIFEST) as Array<[Role, Permission[]]>) {
            const actual = [...getPermissions(role)].sort();
            expect(actual).toEqual([...expected].sort());
        }
    });

    it("enforces sales workflow deny contracts", async () => {
        const ctx = await createIsolatedTestDb("manifest-sales");
        try {
            const noteA = await ctx.repos.chargeNotes.create(1, 1);
            const rA = await ctx.sales.submit(noteA, 1);
            expect(rA.ok).toBe(false);
            if (!rA.ok) expect(rA.error).toBe(SALES_ERROR_MANIFEST.missingItems);

            const noteB = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.chargeNoteItems.create(noteB, 1, 1);
            const rB = await ctx.sales.submit(noteB, 1);
            expect(rB.ok).toBe(false);
            if (!rB.ok) expect(rB.error).toBe(SALES_ERROR_MANIFEST.missingDocuments);

            const noteC = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.chargeNoteItems.create(noteC, 1, 1);
            await ctx.repos.documents.create({
                charge_note_id: noteC,
                filename: "dni.pdf",
                filepath: `uploads/${noteC}/dni.pdf`,
                mimetype: "application/pdf",
                size: 120_000,
            });
            const rC = await ctx.sales.submit(noteC, 1);
            expect(rC.ok).toBe(false);
            if (!rC.ok) expect(rC.error).toBe(SALES_ERROR_MANIFEST.missingInventoryLock);

            const noteD = await prepareSubmittableNote(ctx);
            const submitted = await ctx.sales.submit(noteD, 1);
            expect(submitted.ok).toBe(true);
            const denied = await ctx.sales.approve(noteD, 4, 2, false);
            expect(denied.ok).toBe(false);
            if (!denied.ok) expect(denied.error).toBe(SALES_ERROR_MANIFEST.crossBranchReview);
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("enforces quota deny contracts", async () => {
        const ctx = await createIsolatedTestDb("manifest-quota");
        try {
            const quota = createQuotaService(ctx.repos);
            const day = today();

            const first = await quota.allocate(2, 1, 2, day);
            expect(first.ok).toBe(true);

            const duplicate = await quota.allocate(2, 1, 1, day);
            expect(duplicate.ok).toBe(false);
            if (!duplicate.ok) {
                expect(duplicate.error).toBe(QUOTA_ERROR_MANIFEST.duplicateDailyAllocation);
            }

            expect((await quota.consume(1, 1)).ok).toBe(true);
            expect((await quota.consume(1, 1)).ok).toBe(true);

            const exhausted = await quota.consume(1, 1);
            expect(exhausted.ok).toBe(false);
            if (!exhausted.ok) {
                expect(exhausted.error).toBe(QUOTA_ERROR_MANIFEST.exhausted2of2);
            }
        } finally {
            await cleanupTestDb(ctx);
        }
    });
});
