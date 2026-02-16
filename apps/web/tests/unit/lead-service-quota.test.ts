import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/shared/engine", () => ({
  engineClient: {
    search: vi.fn(async () => ({ results: [], count: 0 })),
    health: vi.fn(async () => true),
  },
}));

import { createLeadAssignmentService } from "~/server/leads/service";
import { createQuotaService } from "~/server/quota/service";
import { engineClient } from "~/server/shared/engine";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

function today() {
  return new Date().toISOString().slice(0, 10);
}

describe("lead service quota invariants", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("lead-service-quota");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("refunds reserved quota when assignment yields zero leads", async () => {
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);
    const day = today();

    await quota.allocate(2, 1, 5, day);
    const before = await quota.getStatus(1);
    expect(before).toMatchObject({ allocated: true, used: 0, remaining: 5 });

    const result = await service.requestLeads(1, 1, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected lead request to succeed");
    expect(result.value).toBe(0);

    const after = await quota.getStatus(1);
    expect(after).toMatchObject({ allocated: true, used: 0, remaining: 5 });
  });

  it("does not consume quota when engine health is down", async () => {
    // oxlint-disable-next-line typescript-eslint/unbound-method
    vi.mocked(engineClient.health).mockResolvedValueOnce(false);
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);
    const day = today();

    await quota.allocate(2, 1, 5, day);
    const result = await service.requestLeads(1, 1, 3);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected engine-down request to fail fast");
    expect(result.error).toContain("Lead engine unavailable");

    const after = await quota.getStatus(1);
    expect(after).toMatchObject({ allocated: true, used: 0, remaining: 5 });
  });
});
