import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  actorFromUser,
  createLeadFixtureWriter,
  createUserFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import {
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/integration/workflow-ports";
import {
  expectLeadAssignment,
  expectLeadMetadata,
  expectLeadStatus,
} from "@tests/support/readers/workflow";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { reassignLeadCommand } from "~/server/workflow/lead/commands/reassign-lead";
import { addLeadNote } from "~/server/workflow/lead/interaction/write";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";

describe("workflow lead mutation metadata", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-lead-mutation-metadata");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  it("updates lead.updatedBy when a note is added", async () => {
    // Register in the past so a later mutation must advance updatedAt to pass.
    runtime.now.set(new Date(10));
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "metadata-note",
      organization: { key: "metadata-note" },
    });

    runtime.now.set(new Date(1_000));
    const result = await addLeadNote(
      {
        actor: actorBy("execOne"),
        leadId: lead.id,
        body: "Test note",
      },
      workflowCommandPorts(runtime),
    );

    expectOk(result);
    await expectLeadMetadata(runtime, {
      actor: actorBy("execOne"),
      leadId: lead.id,
      updatedBy: actorBy("execOne").userId,
      minUpdatedAt: 10,
    });
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    const users = createUserFixtureWriter(runtime);
    const admin = await users.admin();
    const executive = await users.executive();
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "metadata-reassign",
      organization: { key: "metadata-reassign" },
    });

    const reassignResult = await reassignLeadCommand(
      {
        actor: actorFromUser({
          id: admin.id,
          role: "admin",
          branchId: actorBy("execOne").branchId,
        }),
        leadId: lead.id,
        toExecutiveId: executive.id,
      },
      workflowCommandPorts(runtime),
    );

    expectOk(reassignResult);
    const newExecutive = actorFromUser({
      id: executive.id,
      role: "executive",
      branchId: actorBy("execOne").branchId,
    });
    await expectLeadAssignment(runtime, {
      actor: newExecutive,
      leadId: lead.id,
      executiveId: executive.id,
      updatedBy: admin.id,
    });

    const previousActor = actorBy("execOne");
    const previousAccess = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: previousActor.userId,
      actorRole: previousActor.role,
      leadId: lead.id,
    });
    expectErr(previousAccess);

    const newAccess = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: newExecutive.userId,
      actorRole: newExecutive.role,
      leadId: lead.id,
    });
    expectOk(newAccess);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "metadata-import",
      organization: { key: "metadata-import" },
    });
    const importer = createWorkflowImporter({
      runtime,
    });
    const result = await importer.run({
      actor: "backOne",
      rows: [{ type: "status", lead, status: "DISPONIBLE" }],
    });

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);
    await expectLeadStatus(runtime, {
      actor: actorBy("execOne"),
      leadId: lead.id,
      updatedBy: actorBy("backOne").userId,
      status: "DISPONIBLE",
    });
  });
});
