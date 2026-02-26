import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createQuotaService } from "~/server/quota/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

function today() {
  return new Date().toISOString().slice(0, 10);
}

describe("quota service", () => {
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
    if (second.ok) {
      throw new Error("Expected duplicate quota allocation to fail");
    }
    expect(second.error.reason).toBe("quota_already_allocated");
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
    if (!c1.ok || !c2.ok) {
      throw new Error(
        "Expected quota consumption to succeed for first two attempts",
      );
    }
    expect(c1.value).toBe(1);
    expect(c2.value).toBe(0);
    expect(c3.ok).toBe(false);
    if (c3.ok) {
      throw new Error("Expected third quota consumption to fail");
    }
    expect(c3.error.reason).toBe("quota_exhausted");
  });

  it("handles high-volume small consumes correctly", async () => {
    const quota = createQuotaService(ctx.repos);
    const day = today();
    await quota.allocate(2, 1, 120, day);

    const results = await Array.from({ length: 100 }, (_, i) => i).reduce<
      Promise<Array<Awaited<ReturnType<typeof quota.consume>>>>
    >(async (prev) => {
      const acc = await prev;
      const result = await quota.consume(1, 1);
      return [...acc, result];
    }, Promise.resolve([]));

    for (const [index, result] of results.entries()) {
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("Expected quota consumption batch to succeed");
      }
      expect(result.value).toBe(119 - index);
    }
  });
});
