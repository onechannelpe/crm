import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQuotaService } from "~/server/quota/service";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../support/test-db";

describe("quota service", () => {
    const today = () => new Date().toISOString().slice(0, 10);
    let ctx: TestDbContext;

    beforeEach(async () => {
        ctx = await createIsolatedTestDb("quota");
    });

    afterEach(async () => {
        await cleanupTestDb(ctx);
    });

    it("prevents duplicate daily allocations", async () => {
        const quota = createQuotaService(ctx.repos);
        const day = today();

        const first = await quota.allocate(2, 1, 20, day);
        const second = await quota.allocate(2, 1, 10, day);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
        if (!second.ok) {
            expect(second.error).toBe("Quota already allocated for this date");
        }
    });

    it("enforces quota exhaustion while consuming", async () => {
        const quota = createQuotaService(ctx.repos);
        const day = today();
        await quota.allocate(2, 1, 2, day);

        const c1 = await quota.consume(1, 1);
        const c2 = await quota.consume(1, 1);
        const c3 = await quota.consume(1, 1);

        expect(c1.ok).toBe(true);
        expect(c2.ok).toBe(true);
        if (c1.ok) expect(c1.value).toBe(1);
        if (c2.ok) expect(c2.value).toBe(0);
        expect(c3.ok).toBe(false);
        if (!c3.ok) {
            expect(c3.error).toBe("Quota exhausted: 2/2 used.");
        }
    });

    it("handles high-volume small consumes correctly", async () => {
        const quota = createQuotaService(ctx.repos);
        const day = today();
        await quota.allocate(2, 1, 120, day);

        for (let i = 0; i < 100; i++) {
            const result = await quota.consume(1, 1);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe(119 - i);
            }
        }
    });

});
