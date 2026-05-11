import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import {
  expectLeadAssignment,
  expectLeadMetadata,
  expectLeadStatus,
} from "@tests/support/workflow/expect";
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
      stage: "QUALIFYING",
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

    expectOk(result);
    await expectLeadMetadata(runtime, {
      leadId: lead.id,
      updatedBy: 1,
      minUpdatedAt: 10,
    });
  });

  it("allows admins to reassign and removes access from previous executive", async () => {
    const scenario = createWorkflowScenario(runtime);
    const admin = await scenario.user.admin();
    const executive = await scenario.user.executive();
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "metadata-reassign",
      organization: { key: "metadata-reassign" },
      stage: "QUALIFYING",
      createdAt: 10,
      updatedAt: 10,
    });

    const reassignResult = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.reassignLead({
        actor: scenario.actor.fromUser({
          id: admin.id,
          role: "admin",
          branchId: 1,
        }),
        leadId: lead.id,
        toExecutiveId: executive.id,
      }),
    );

    expectOk(reassignResult);
    await expectLeadAssignment(runtime, {
      leadId: lead.id,
      executiveId: executive.id,
      updatedBy: admin.id,
    });

    const previousAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor.by("execOne"),
      leadId: lead.id,
    });
    expectErr(previousAccess);

    const newAccess = await runtime.workflow.queryApi.getLeadDetail({
      actor: scenario.actor.fromUser({
        id: executive.id,
        role: "executive",
        branchId: 1,
      }),
      leadId: lead.id,
    });
    expectOk(newAccess);
  });

  it("updates lead.updatedBy for import mutations", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "metadata-import",
      organization: { key: "metadata-import" },
      stage: "QUALIFYING",
    });
    const result = await scenario.importer.run({
      actor: "backOne",
      rows: [{ type: "status", lead, status: "DISPONIBLE" }],
    });

    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);
    await expectLeadStatus(runtime, {
      leadId: lead.id,
      updatedBy: 2,
      status: "DISPONIBLE",
    });
  });
});
