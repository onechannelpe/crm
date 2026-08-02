import { expectErr } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { withMerchantDefaults } from "@tests/support/database/workflow-seed";
import {
  registerLeadPorts,
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { BranchId, WorkflowLeadId } from "~/domain/ids";
import { closeLeadCommand } from "~/server/workflow/lead/commands/close-lead";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";

// The cap is disabled by default; each test that expects blocking sets it first.
const BRANCH_CAP = 3;

async function setBranchCap(
  runtime: TestRuntime,
  branchId: BranchId,
  clientLimit: number,
): Promise<void> {
  await workflowRepos(runtime).pendingQuotationPolicies.upsert({
    branchId,
    clientLimit,
    updatedAt: runtime.now.get(),
    updatedByUserId: actorBy("execOne").userId,
  });
}

async function fillPendingQuotations(
  runtime: TestRuntime,
  count: number,
): Promise<WorkflowLeadId[]> {
  const givenLead = createLeadFixtureWriter(runtime);
  const leadIds: WorkflowLeadId[] = [];
  for (let i = 0; i < count; i++) {
    const lead = await givenLead({
      kind: "pricing",
      key: `pending-${i}`,
      proposal: "pending",
    });
    leadIds.push(lead.id);
  }
  return leadIds;
}

function registerFor(runtime: TestRuntime, ruc: string) {
  const exec = actorBy("execOne");
  const ports = registerLeadPorts(runtime);
  return registerLead(
    {
      actor: {
        userId: exec.userId,
        role: "executive",
        branchId: exec.branchId,
      },
      ruc,
      lineOfBusiness: "Retail",
      ...withMerchantDefaults(undefined),
    },
    ports,
    { identity: ports.identity },
  );
}

describe("pending quotation registration cap", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-pending-cap");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  it("allows registration past the pending count when the branch has no cap", async () => {
    await fillPendingQuotations(runtime, BRANCH_CAP);

    const allowed = await registerFor(runtime, "20999999990");

    expect(allowed.ok).toBe(true);
  });

  it("blocks a new registration once the executive reaches the branch cap", async () => {
    const exec = actorBy("execOne");
    await setBranchCap(runtime, exec.branchId, BRANCH_CAP);

    await fillPendingQuotations(runtime, BRANCH_CAP);

    const blocked = await registerFor(runtime, "20999999991");

    expect(expectErr(blocked).code).toBe("pending_quotation_limit");
  });

  it("allows registration again after the executive resolves a pending quotation", async () => {
    const exec = actorBy("execOne");
    await setBranchCap(runtime, exec.branchId, BRANCH_CAP);

    const leadIds = await fillPendingQuotations(runtime, BRANCH_CAP);

    // Closing one quotation as lost moves it out of PRICING, freeing a slot.
    const closed = await closeLeadCommand(
      { actor: exec, leadId: leadIds[0], reason: "RATE", note: null },
      workflowCommandPorts(runtime),
    );
    expect(closed.ok).toBe(true);

    const allowed = await registerFor(runtime, "20999999992");

    expect(allowed.ok).toBe(true);
  });
});
