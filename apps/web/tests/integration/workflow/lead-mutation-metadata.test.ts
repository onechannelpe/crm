import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("workflow lead mutation metadata", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-lead-mutation-metadata");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("updates lead.updatedBy when a note is added", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "metadata-note",
      organization: { key: "metadata-note" },
      stage: "PENDING_EXTERNAL_REVIEW",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.addLeadNote({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        body: "Test note",
      }),
    );

    expect(result.ok).toBe(true);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "updated_at"])
      .where("id", "=", lead.id)
      .executeTakeFirstOrThrow();

    expect(leadRow.updated_by).toBe(1);
    expect(leadRow.updated_at).toBeGreaterThan(10);
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    const scenario = createWorkflowScenario(runtime);
    const admin = await scenario.user.admin();
    const executive = await scenario.user.executive();
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "metadata-reassign",
      organization: { key: "metadata-reassign" },
      stage: "PENDING_EXTERNAL_REVIEW",
      createdAt: 10,
      updatedAt: 10,
    });

    const reassignResult = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.reassignLead({
        actor: { userId: admin.id, role: "admin", branchId: 1 },
        leadId: lead.id,
        toExecutiveId: executive.id,
      }),
    );

    expect(reassignResult.ok).toBe(true);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["executive_id", "updated_by"])
      .where("id", "=", lead.id)
      .executeTakeFirstOrThrow();
    expect(leadRow.executive_id).toBe(executive.id);
    expect(leadRow.updated_by).toBe(admin.id);

    const previousAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 1, role: "executive", branchId: 1 },
      leadId: lead.id,
    });
    expect(previousAccess.ok).toBe(false);

    const newAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: executive.id, role: "executive", branchId: 1 },
      leadId: lead.id,
    });
    expect(newAccess.ok).toBe(true);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "metadata-import",
      organization: { key: "metadata-import" },
      stage: "PENDING_EXTERNAL_REVIEW",
    });
    const result = await scenario.importer.run({
      actor: "backOne",
      rows: [{ type: "status", lead, status: "DISPONIBLE" }],
    });

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "status"])
      .where("id", "=", lead.id)
      .executeTakeFirstOrThrow();
    expect(leadRow.updated_by).toBe(2);
    expect(leadRow.status).toBe("DISPONIBLE");
  });
});
