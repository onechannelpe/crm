import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/workflow/deps";
import {
  expectLeadAssignment,
  expectLeadMetadata,
  expectLeadStatus,
} from "@tests/support/workflow/expect";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addLeadNote } from "~/server/workflow/lead/interaction/write";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { reassignLeadCommand } from "~/server/workflow/lead/write/reassign-lead";

describe("workflow lead mutation metadata", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-lead-mutation-metadata");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("updates lead.updatedBy when a note is added", async () => {
    const scenario = createWorkflowScenario(runtime);
    // Register in the past so a later mutation must advance updatedAt to pass.
    runtime.now.set(10);
    const lead = await scenario.lead.atStage("QUALIFYING", {
      key: "metadata-note",
      organization: { key: "metadata-note" },
    });

    runtime.now.set(1_000);
    const result = await addLeadNote(
      {
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        body: "Test note",
      },
      workflowCommandPorts(runtime),
    );

    expectOk(result);
    await expectLeadMetadata(runtime, {
      actor: scenario.actor.by("execOne"),
      leadId: lead.id,
      updatedBy: 1,
      minUpdatedAt: 10,
    });
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    const scenario = createWorkflowScenario(runtime);
    const admin = await scenario.user.admin();
    const executive = await scenario.user.executive();
    const lead = await scenario.lead.atStage("QUALIFYING", {
      key: "metadata-reassign",
      organization: { key: "metadata-reassign" },
    });

    const reassignResult = await reassignLeadCommand(
      {
        actor: scenario.actor.fromUser({
          id: admin.id,
          role: "admin",
          branchId: 1,
        }),
        leadId: lead.id,
        toExecutiveId: executive.id,
      },
      workflowCommandPorts(runtime),
    );

    expectOk(reassignResult);
    const newExecutive = scenario.actor.fromUser({
      id: executive.id,
      role: "executive",
      branchId: 1,
    });
    await expectLeadAssignment(runtime, {
      actor: newExecutive,
      leadId: lead.id,
      executiveId: executive.id,
      updatedBy: admin.id,
    });

    const previousActor = scenario.actor.by("execOne");
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
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.atStage("QUALIFYING", {
      key: "metadata-import",
      organization: { key: "metadata-import" },
    });
    const result = await scenario.importer.run({
      actor: "backOne",
      rows: [{ type: "status", lead, status: "DISPONIBLE" }],
    });

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);
    await expectLeadStatus(runtime, {
      actor: scenario.actor.by("execOne"),
      leadId: lead.id,
      updatedBy: 2,
      status: "DISPONIBLE",
    });
  });
});
