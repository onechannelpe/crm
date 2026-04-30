import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";
import { registerLeadAndLoadSnapshot } from "../support/workflow-register-test-kit";
import { runTestWorkflowCommand } from "../support/workflow-test-kit";

describe("register lead", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-register-record");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("reuses an existing organization for the same RUC", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20100000001",
      enrichByRuc: async () => ({
        razonSocial: "Should Not Replace Existing Org",
        address: "Should Not Replace Existing Address",
      }),
    });

    expect(snapshot.organizationRuc).toBe("20100000001");
    expect(snapshot.organizationName).toBe("Org Lima");
  });

  it("creates organization from enrichment when RUC is new", async () => {
    const auditLog = vi.fn<() => Promise<void>>(async () => undefined);

    const result = await runTestWorkflowCommand(
      runtime,
      (commandApi) =>
        commandApi.registerLead({
          actor: { userId: 1, role: "admin", branchId: 1 },
          ruc: "20912345671",
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

    const snapshot = await runtime.ctx.db
      .selectFrom("workflow_leads as lead")
      .innerJoin("organizations as org", "org.id", "lead.organization_id")
      .select(["org.ruc", "org.name", "org.address"])
      .where("lead.id", "=", result.value.leadId)
      .executeTakeFirstOrThrow();

    const history = await runtime.ctx.db
      .selectFrom("workflow_history_events")
      .select(["event_type"])
      .where("lead_id", "=", result.value.leadId)
      .orderBy("occurred_at", "asc")
      .execute();

    expect(snapshot.ruc).toBe("20912345671");
    expect(snapshot.name).toBe("Acme SAC");
    expect(snapshot.address).toBe("Av. Lima 123");
    expect(history.map((event) => event.event_type)).toEqual([
      "lead_registered",
      "lead_assigned",
    ]);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it("creates organization with RUC fallback when enrichment is unavailable", async () => {
    const snapshot = await registerLeadAndLoadSnapshot({
      runtime,
      ruc: "20912345672",
      enrichByRuc: async () => null,
    });

    expect(snapshot.organizationRuc).toBe("20912345672");
    expect(snapshot.organizationName).toBe("20912345672");
    expect(snapshot.organizationAddress).toBeNull();
  });
});
