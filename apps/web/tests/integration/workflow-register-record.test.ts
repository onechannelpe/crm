import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";
import { runTestWorkflowCommand } from "../support/workflow-test-kit";

describe("register lead", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-register-record");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("fills legal name and address from engine enrichment and writes history events", async () => {
    const auditLog = vi.fn<() => Promise<void>>(async () => undefined);

    const result = await runTestWorkflowCommand(
      runtime,
      (commandApi) =>
        commandApi.registerLead({
          actor: { userId: 1, role: "admin", branchId: 1 },
          ruc: "20100000001",
          executiveId: 1,
        }),
      {
        engineGateway: {
          enrichByRuc: async () => ({
            razonSocial: "Acme SAC",
            address: "Av. Lima 123",
          }),
        },
        auditService: { log: auditLog },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = await runtime.ctx.db
      .selectFrom("workflow_leads as lead")
      .innerJoin("organizations as org", "org.id", "lead.organization_id")
      .select(["org.name as razon_social", "org.address"])
      .where("lead.id", "=", result.value.leadId)
      .executeTakeFirstOrThrow();
    const history = await runtime.ctx.db
      .selectFrom("workflow_history_events")
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
    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.registerLead({
        actor: { userId: 1, role: "admin", branchId: 1 },
        ruc: "20100000002",
        executiveId: 1,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = await runtime.ctx.db
      .selectFrom("workflow_leads as lead")
      .innerJoin("organizations as org", "org.id", "lead.organization_id")
      .select(["org.name as razon_social", "org.address"])
      .where("lead.id", "=", result.value.leadId)
      .executeTakeFirstOrThrow();

    expect(record.razon_social).toBe("20100000002");
    expect(record.address).toBeNull();
  });
});
