import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "~/server/integrations/application/import/apply-service";

import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";

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
    const lead = await scenario.givenLead({
      key: "metadata-note",
      organization: {
        key: "metadata-note",
        ruc: "20900000501",
        name: "Org Note",
      },
      executive: "execOne",
      stage: "PENDING_EXTERNAL_REVIEW",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.addLeadNote({
        actor: scenario.actor("execOne"),
        leadId: lead.leadId,
        body: "Test note",
      }),
    );

    expect(result.ok).toBe(true);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "updated_at"])
      .where("id", "=", lead.leadId)
      .executeTakeFirstOrThrow();

    expect(leadRow.updated_by).toBe(1);
    expect(leadRow.updated_at).toBeGreaterThan(10);
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    const scenario = createWorkflowScenario(runtime);
    await scenario.givenUser({
      id: 11,
      username: "admin.one",
      email: "admin1@test.local",
      names: "Admin",
      firstSurname: "One",
      secondSurname: "Alpha",
      role: "admin",
      phoneE164: "+51990000111",
    });
    await scenario.givenUser({
      id: 12,
      username: "exec.new",
      email: "execnew@test.local",
      names: "Exec",
      firstSurname: "New",
      secondSurname: "Alpha",
      role: "executive",
      phoneE164: "+51990000112",
    });
    const lead = await scenario.givenLead({
      key: "metadata-reassign",
      organization: {
        key: "metadata-reassign",
        ruc: "20900000502",
        name: "Org Reassign",
      },
      executive: "execOne",
      stage: "PENDING_EXTERNAL_REVIEW",
      createdAt: 10,
      updatedAt: 10,
    });

    const reassignResult = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.reassignLead({
        actor: { userId: 11, role: "admin", branchId: 1 },
        leadId: lead.leadId,
        toExecutiveId: 12,
      }),
    );

    expect(reassignResult.ok).toBe(true);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["executive_id", "updated_by"])
      .where("id", "=", lead.leadId)
      .executeTakeFirstOrThrow();
    expect(leadRow.executive_id).toBe(12);
    expect(leadRow.updated_by).toBe(11);

    const previousAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 1, role: "executive", branchId: 1 },
      leadId: lead.leadId,
    });
    expect(previousAccess.ok).toBe(false);

    const newAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 12, role: "executive", branchId: 1 },
      leadId: lead.leadId,
    });
    expect(newAccess.ok).toBe(true);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.givenLead({
      key: "metadata-import",
      organization: {
        key: "metadata-import",
        ruc: "20900000503",
        name: "Org Import",
      },
      executive: "execOne",
      stage: "PENDING_EXTERNAL_REVIEW",
    });
    const job = await scenario.givenImportJob("9001");

    const result = await applyImportRows(
      {
        jobId: job.jobId,
        actorId: 2,
        validRows: [
          {
            row: 1,
            ruc: "20900000503",
            type: "import_status",
            status: "DISPONIBLE",
          },
        ],
        invalidRows: [],
      },
      runtime.integrations.executor,
    );

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);

    const leadRow = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "status"])
      .where("id", "=", lead.leadId)
      .executeTakeFirstOrThrow();
    expect(leadRow.updated_by).toBe(2);
    expect(leadRow.status).toBe("DISPONIBLE");
  });
});
