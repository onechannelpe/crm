import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyImportRows } from "../../src/server/integrations/application/import/apply-service";
import { getLeadDetail } from "../../src/server/pipeline/application/queries/get-lead-detail";
import { createPipelineCommandApiRuntime } from "../../src/server/pipeline/infrastructure/runtime/pipeline-command-api-factory";
import {
  asUserId,
  asBranchId,
  asAssignmentId,
  asContactId,
} from "../../src/server/shared/ids";
import { insertTestLead } from "../support/pipeline/fixtures";
import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("pipeline lead mutation metadata", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("pipeline-lead-mutation-metadata");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("updates lead.updatedBy when a note is added", async () => {
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      ruc: "20900000501",
      razonSocial: "Org Note",
    });

    const commandApi = createPipelineCommandApiRuntime({
      deps: runtime.pipeline.deps,
      executor: runtime.ctx.db,
      notificationCenter: {
        notifyUsers: async () => {},
        notifyBranchRoles: async () => {},
      },
      auditService: { log: async () => {} },
      engineGateway: { enrichByRuc: async () => null },
      leadEnrichmentQueue: { enqueueRucVerification: async () => {} },
    });

    const result = await commandApi.addLeadNote({
      actor: {
        userId: asUserId("1"),
        role: "executive",
        branchId: asBranchId("1"),
      },
      leadId,
      body: "Test note",
    });

    expect(result.ok).toBe(true);

    const lead = await runtime.ctx.db
      .selectFrom("pipeline_leads")
      .select(["updated_by", "updated_at"])
      .where("id", "=", leadId)
      .executeTakeFirstOrThrow();

    expect(lead.updated_by).toBe(asUserId("1"));
    expect(lead.updated_at).toBeGreaterThan(10);
  });

  it("allows supervisors to reassign and removes access from previous executive", async () => {
    const now = Date.now();
    await runtime.ctx.db
      .insertInto("lead_assignments")
      .values([
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a1"),
          user_id: asUserId("1"),
          contact_id: asContactId("1"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a2"),
          user_id: asUserId("1"),
          contact_id: asContactId("2"),
          assigned_at: now,
          expires_at: now - 1,
          status: "active",
        },
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a3"),
          user_id: asUserId("1"),
          contact_id: asContactId("2"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "completed",
        },
      ])
      .execute();

    await runtime.ctx.db
      .insertInto("users")
      .values([
        {
          id: asUserId("11"),
          branch_id: asBranchId("1"),
          team_id: null,
          username: "supervisor.one",
          email: "supervisor1@test.local",
          password_hash: "hash",
          names: "Supervisor",
          first_surname: "One",
          second_surname: "Alpha",
          phone_e164: "+51990000111",
          onboarding_completed_at: now,
          role: "supervisor",
          is_active: 1,
          created_at: now,
        },
        {
          id: asUserId("12"),
          branch_id: asBranchId("1"),
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

    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      ruc: "20900000502",
      razonSocial: "Org Reassign",
    });

    const commandApi = createPipelineCommandApiRuntime({
      deps: runtime.pipeline.deps,
      executor: runtime.ctx.db,
      notificationCenter: {
        notifyUsers: async () => {},
        notifyBranchRoles: async () => {},
      },
      auditService: { log: async () => {} },
      engineGateway: { enrichByRuc: async () => null },
      leadEnrichmentQueue: { enqueueRucVerification: async () => {} },
    });

    const reassignResult = await commandApi.reassignLead({
      actor: {
        userId: asUserId("11"),
        role: "supervisor",
        branchId: asBranchId("1"),
      },
      leadId,
      toExecutiveId: asUserId("12"),
    });

    expect(reassignResult.ok).toBe(true);

    const lead = await runtime.ctx.db
      .selectFrom("pipeline_leads")
      .select(["executive_id", "updated_by"])
      .where("id", "=", leadId)
      .executeTakeFirstOrThrow();
    expect(lead.executive_id).toBe(asUserId("12"));
    expect(lead.updated_by).toBe(asUserId("11"));

    const previousExecutiveAccess = await getLeadDetail(
      runtime.pipeline.deps.leadDetail,
      { actorUserId: asUserId("1"), actorRole: "executive", leadId },
    );
    expect(previousExecutiveAccess.ok).toBe(false);

    const newExecutiveAccess = await getLeadDetail(
      runtime.pipeline.deps.leadDetail,
      { actorUserId: asUserId("12"), actorRole: "executive", leadId },
    );
    expect(newExecutiveAccess.ok).toBe(true);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    const now = Date.now();
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      ruc: "20900000503",
      razonSocial: "Org Import",
      createdAt: now,
    });

    await runtime.ctx.db
      .insertInto("pipeline_integration_jobs")
      .values({
        id: 9001,
        type: "import_status",
        status: "PROCESSING",
        requested_by_user_id: asUserId("2"),
        file_path: "inline",
        error_message: null,
        rows_total: null,
        rows_applied: null,
        rows_failed: null,
        results_json: null,
        lease_owner: asUserId("test-worker"),
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
        jobId: 9001,
        actorId: asUserId("2"),
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
      .selectFrom("pipeline_leads")
      .select(["updated_by", "status"])
      .where("id", "=", leadId)
      .executeTakeFirstOrThrow();
    expect(lead.updated_by).toBe(asUserId("2"));
    expect(lead.status).toBe("DISPONIBLE");
  });
});
