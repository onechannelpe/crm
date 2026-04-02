import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerLead } from "../../src/server/pipeline/application/commands/register-lead";
import { createPipelineDeps } from "../../src/server/pipeline/infrastructure/deps";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("register lead", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("pipeline-register-record");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("fills legal name and address from engine enrichment and writes history events", async () => {
    const auditLog = vi.fn<() => Promise<void>>(async () => undefined);

    const result = await ctx.db.transaction().execute((trx) =>
      registerLead({
        ruc: "20100000001",
        executiveId: 1,
        actorUserId: 1,
        actorRole: "admin",
        deps: createPipelineDeps(trx),
        engineGateway: {
          enrichByRuc: async () => ({
            razonSocial: "Acme SAC",
            address: "Av. Lima 123",
          }),
        },
        auditService: {
          log: auditLog,
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = await ctx.db
      .selectFrom("pipeline_leads")
      .selectAll()
      .where("id", "=", result.value.leadId)
      .executeTakeFirstOrThrow();
    const history = await ctx.db
      .selectFrom("pipeline_history_events")
      .select(["event_type", "subject_user_id", "payload_json"])
      .where("lead_id", "=", result.value.leadId)
      .orderBy("occurred_at", "asc")
      .execute();

    expect(record.razon_social).toBe("Acme SAC");
    expect(record.address).toBe("Av. Lima 123");
    expect(history.map((event) => event.event_type)).toEqual([
      "lead_registered",
      "lead_assigned",
    ]);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it("keeps registration working when enrichment is unavailable", async () => {
    const result = await ctx.db.transaction().execute((trx) =>
      registerLead({
        ruc: "20100000002",
        executiveId: 1,
        actorUserId: 1,
        actorRole: "admin",
        deps: createPipelineDeps(trx),
        engineGateway: {
          enrichByRuc: async () => null,
        },
        auditService: {
          log: async () => undefined,
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = await ctx.db
      .selectFrom("pipeline_leads")
      .select(["razon_social", "address"])
      .where("id", "=", result.value.leadId)
      .executeTakeFirstOrThrow();

    expect(record.razon_social).toBeNull();
    expect(record.address).toBeNull();
  });
});
