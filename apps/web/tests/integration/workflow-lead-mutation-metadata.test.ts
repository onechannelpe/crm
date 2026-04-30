import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "~/server/integrations/application/import/apply-service";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";
import {
  seedImportJob,
  seedLead,
  seedOrganization,
  seedUser,
} from "../support/workflow-fixtures";
import { runTestWorkflowCommand } from "../support/workflow-test-kit";

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
    await seedOrganization(runtime, {
      id: "01974fd5-f261-7a7d-93f5-2f3d0f963501",
      ruc: "20900000501",
      name: "Org Note",
    });
    await seedLead(runtime, {
      id: "lead-501",
      organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963501",
      executiveId: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.addLeadNote({
        actor: { userId: 1, role: "executive", branchId: 1 },
        leadId: "lead-501",
        body: "Test note",
      }),
    );

    expect(result.ok).toBe(true);

    const lead = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "updated_at"])
      .where("id", "=", "lead-501")
      .executeTakeFirstOrThrow();

    expect(lead.updated_by).toBe(1);
    expect(lead.updated_at).toBeGreaterThan(10);
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    await seedUser(runtime, {
      id: 11,
      username: "admin.one",
      email: "admin1@test.local",
      names: "Admin",
      firstSurname: "One",
      secondSurname: "Alpha",
      role: "admin",
      phoneE164: "+51990000111",
    });
    await seedUser(runtime, {
      id: 12,
      username: "exec.new",
      email: "execnew@test.local",
      names: "Exec",
      firstSurname: "New",
      secondSurname: "Alpha",
      role: "executive",
      phoneE164: "+51990000112",
    });
    await seedOrganization(runtime, {
      id: "01974fd5-f261-7a7d-93f5-2f3d0f963502",
      ruc: "20900000502",
      name: "Org Reassign",
    });
    await seedLead(runtime, {
      id: "lead-502",
      organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963502",
      executiveId: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
      createdAt: 10,
      updatedAt: 10,
    });

    const reassignResult = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.reassignLead({
        actor: { userId: 11, role: "admin", branchId: 1 },
        leadId: "lead-502",
        toExecutiveId: 12,
      }),
    );

    expect(reassignResult.ok).toBe(true);

    const lead = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["executive_id", "updated_by"])
      .where("id", "=", "lead-502")
      .executeTakeFirstOrThrow();
    expect(lead.executive_id).toBe(12);
    expect(lead.updated_by).toBe(11);

    const previousAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 1, role: "executive", branchId: 1 },
      leadId: "lead-502",
    });
    expect(previousAccess.ok).toBe(false);

    const newAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: { userId: 12, role: "executive", branchId: 1 },
      leadId: "lead-502",
    });
    expect(newAccess.ok).toBe(true);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    await seedOrganization(runtime, {
      id: "01974fd5-f261-7a7d-93f5-2f3d0f963503",
      ruc: "20900000503",
      name: "Org Import",
    });
    await seedLead(runtime, {
      id: "lead-503",
      organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963503",
      executiveId: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
    });
    await seedImportJob(runtime, { id: "job-9001" });

    const result = await applyImportRows(
      {
        jobId: "job-9001",
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

    const lead = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["updated_by", "status"])
      .where("id", "=", "lead-503")
      .executeTakeFirstOrThrow();
    expect(lead.updated_by).toBe(2);
    expect(lead.status).toBe("DISPONIBLE");
  });
});
