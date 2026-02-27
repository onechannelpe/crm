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
    expect(before.ok).toBe(true);
    if (!before.ok) throw new Error("Expected quota status read to succeed");
    expect(before.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });

    const result = await service.requestLeads(1, 1, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected lead request to succeed");
    expect(result.value).toBe(0);

    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });
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
    expect(result.error.reason).toBe("engine_unavailable");

    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });
  });

  it("refunds consumed quota when engine search fails mid-assignment", async () => {
    // oxlint-disable-next-line typescript-eslint/unbound-method
    vi.mocked(engineClient.search).mockRejectedValueOnce(
      new Error("engine search outage"),
    );
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);
    const day = today();

    await quota.allocate(2, 1, 5, day);
    const result = await service.requestLeads(1, 1, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected engine search failure to be mapped to Result");
    }
    expect(result.error.reason).toBe("unexpected");

    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });
  });

  it("refunds consumed quota when persistence fails after assignment selection", async () => {
    // oxlint-disable-next-line typescript-eslint/unbound-method
    vi.mocked(engineClient.search).mockResolvedValueOnce({
      count: 1,
      results: [
        {
          person: {
            dni: "70010001",
            name: "Contacto Caido",
          },
          org: {
            ruc: "20100000001",
            name: "Org Lima",
          },
          role: null,
          phones: { primary: "+51911111111", secondary: null, siblings: null },
        },
      ],
    });
    vi.spyOn(ctx.repos.leadAssignments, "createMany").mockRejectedValueOnce(
      new Error("db write outage"),
    );
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);
    const day = today();

    await quota.allocate(2, 1, 5, day);
    const result = await service.requestLeads(1, 1, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected persistence failure to be mapped to Result");
    }
    expect(result.error.reason).toBe("unexpected");

    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });
  });
});
