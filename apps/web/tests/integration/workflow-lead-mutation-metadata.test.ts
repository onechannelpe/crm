import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "~/server/integrations/application/import/apply-service";

import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";
import { runTestWorkflowCommand } from "../support/workflow-test-kit";

describe("workflow lead mutation metadata", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-lead-mutation-metadata");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("updates lead.updatedBy when a note is added", async () => {
    await runtime.ctx.db
      .insertInto("organizations")
      .values({
        id: 501,
        ruc: "20900000501",
        name: "Org Note",
        created_at: 10,
      })
      .execute();
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-501",
        organization_id: 501,
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: 1,
        created_at: 10,
        updated_by: null,
        updated_at: 10,
      })
      .execute();

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
    const now = Date.now();
    await runtime.ctx.db
      .insertInto("users")
      .values([
        {
          id: 11,
          branch_id: 1,
          team_id: null,
          username: "admin.one",
          email: "admin1@test.local",
          password_hash: "hash",
          names: "Admin",
          first_surname: "One",
          second_surname: "Alpha",
          phone_e164: "+51990000111",
          onboarding_completed_at: now,
          role: "admin",
          is_active: 1,
          created_at: now,
        },
        {
          id: 12,
          branch_id: 1,
          team_id: null,
          username: "exec.new",
          email: "execnew@test.local",
          password_hash: "hash",
          names: "Exec",
          first_surname: "New",
          second_surname: "Alpha",
          phone_e164: "+51990000112",
          onboarding_completed_at: now,
          role: "executive",
          is_active: 1,
          created_at: now,
        },
      ])
      .execute();

    await runtime.ctx.db
      .insertInto("organizations")
      .values({
        id: 502,
        ruc: "20900000502",
        name: "Org Reassign",
        created_at: now,
      })
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-502",
        organization_id: 502,
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: 1,
        created_at: 10,
        updated_by: null,
        updated_at: 10,
      })
      .execute();

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
    const now = Date.now();
    await runtime.ctx.db
      .insertInto("organizations")
      .values({
        id: 503,
        ruc: "20900000503",
        name: "Org Import",
        created_at: now,
      })
      .execute();
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-503",
        organization_id: 503,
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: 1,
        created_at: now,
        updated_by: null,
        updated_at: now,
      })
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_integration_jobs")
      .values({
        id: "job-9001",
        type: "import_status",
        status: "PROCESSING",
        requested_by_user_id: 2,
        file_path: "inline",
        error_message: null,
        rows_total: null,
        rows_applied: null,
        rows_failed: null,
        results_json: null,
        lease_owner: "test-worker",
        lease_until: now + 30_000,
        attempt_count: 1,
        max_attempts: 3,
        available_at: null,
        created_at: now,
        completed_at: null,
      })
      .execute();

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
