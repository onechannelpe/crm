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
            ruc: null,
            birth_date: null,
            birth_place: null,
            sex: null,
            marital_status: null,
            location_text: null,
            ubigeo_code: null,
            mother_name: null,
            father_name: null,
            email: null,
          },
          org: {
            ruc: "20100000001",
            name: "Org Lima",
            trade_name: null,
            company_type: null,
            status: null,
            condition: null,
            fiscal_address: null,
            registration_date: null,
            activity_start_date: null,
            line_of_business: null,
            economic_activity: null,
            ubigeo_code: null,
            department: null,
            province: null,
            district: null,
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

  it("returns quota_error when quota is exhausted before assignment", async () => {
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);
    const day = today();

    await quota.allocate(2, 1, 2, day);
    await quota.consume(1, 2); // exhaust all 2

    const result = await service.requestLeads(1, 1, 3); // needs 3, 0 remaining
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected quota_error for exhausted quota");
    expect(result.error.reason).toBe("quota_error");

    // Nothing consumed or refunded beyond what we pre-consumed
    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 2,
      remaining: 0,
    });
  });

  it("returns Ok(0) immediately without consuming quota when buffer is already full", async () => {
    const quota = createQuotaService(ctx.repos);
    const service = createLeadAssignmentService(ctx.repos);

    await quota.allocate(2, 1, 5, today());
    vi.spyOn(
      ctx.repos.leadAssignments,
      "countActiveByUser",
    ).mockResolvedValueOnce(3);

    const result = await service.requestLeads(1, 1, 3); // bufferSize=3, active=3 → needed=0
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected Ok(0) for full buffer");
    expect(result.value).toBe(0);

    // Early return must have fired before consume
    const after = await quota.getStatus(1);
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error("Expected quota status read to succeed");
    expect(after.value).toMatchObject({
      allocated: true,
      used: 0,
      remaining: 5,
    });
  });

  it("returns quota_error when no quota is allocated for the user", async () => {
    const service = createLeadAssignmentService(ctx.repos);

    // user 1 has no allocation for today
    const result = await service.requestLeads(1, 1, 3);
    expect(result.ok).toBe(false);
    if (result.ok)
      throw new Error("Expected quota_error for missing allocation");
    expect(result.error.reason).toBe("quota_error");
  });
});
