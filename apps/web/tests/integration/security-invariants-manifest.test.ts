import { describe, expect, it } from "vitest";
import { getPermissions, type Permission, type Role } from "../../src/lib/auth/rbac";
import { createQuotaService } from "../../src/server/quota/service";
import { createIsolatedTestDb, cleanupTestDb, type TestDbContext } from "../support/test-db";

const PERMISSION_MANIFEST: Record<Role, Permission[]> = {
    executive: ["leads:read", "leads:request", "quota:read", "sales:create", "sales:submit"],
    supervisor: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "audit:read"],
    back_office: ["sales:review", "sales:approve", "audit:read"],
    sales_manager: ["leads:read", "quota:read", "quota:allocate", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "audit:read", "admin:read", "admin:manage"],
    logistics: ["inventory:read", "inventory:manage"],
    hr: ["hr:read", "hr:manage", "team:read"],
    admin: ["leads:read", "quota:read", "quota:allocate", "sales:review", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
    superuser: ["leads:read", "leads:request", "quota:read", "quota:allocate", "sales:create", "sales:submit", "sales:review", "sales:approve", "team:read", "team:manage", "inventory:read", "inventory:manage", "hr:read", "hr:manage", "admin:read", "admin:manage", "audit:read"],
};

const SALES_ERROR_MANIFEST = {
    missingItems: "At least one product item is required before submission",
    missingDocuments: "At least one document is required before submission",
    missingInventoryLock: "An active inventory lock is required before submission",
    crossBranchReview: "Cannot review a sale from another branch",
} as const;

const QUOTA_ERROR_MANIFEST = {
    duplicateDailyAllocation: "Quota already allocated for this date",
    exhausted2of2: "Quota exhausted: 2/2 used.",
} as const;

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
            const day = "2026-02-14";

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
