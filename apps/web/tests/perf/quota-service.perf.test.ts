import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQuotaService } from "~/server/quota/service";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../support/test-db";

describe("quota performance", () => {
    let ctx: TestDbContext;

    beforeEach(async () => {
        ctx = await createIsolatedTestDb("quota-perf");
    });

    afterEach(async () => {
        await cleanupTestDb(ctx);
    });

    it("consumes quota in bulk within a performance budget", async () => {
        const quota = createQuotaService(ctx.repos);
        const day = new Date().toISOString().slice(0, 10);
        await quota.allocate(2, 1, 120, day);

        const started = Date.now();
        for (let i = 0; i < 100; i++) {
            await quota.consume(1, 1);
        }
        expect(Date.now() - started).toBeLessThan(5000);
    });
});
