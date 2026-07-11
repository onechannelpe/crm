import { expectErr } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { withMerchantDefaults } from "@tests/support/database/workflow-seed";
import {
  registerLeadPorts,
  workflowCommandPorts,
} from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MAX_PENDING_QUOTATION_DECISIONS } from "~/contracts/workflow/limits";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { closeLeadCommand } from "~/server/workflow/lead/commands/close-lead";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";

async function fillPendingQuotations(
  runtime: TestRuntime,
): Promise<WorkflowLeadId[]> {
  const givenLead = createLeadFixtureWriter(runtime);
  const leadIds: WorkflowLeadId[] = [];
  for (let i = 0; i < MAX_PENDING_QUOTATION_DECISIONS; i++) {
    const lead = await givenLead({
      kind: "pricing",
      key: `pending-${i}`,
      proposal: "pending",
    });
    leadIds.push(lead.id);
  }
  return leadIds;
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

  it("blocks a new registration once the executive holds the max pending quotation decisions", async () => {
    const exec = actorBy("execOne");

    await fillPendingQuotations(runtime);

    const blocked = await registerLead(
      {
        actor: {
          userId: exec.userId,
          role: "executive",
          branchId: exec.branchId,
        },
        ruc: "20999999991",
        lineOfBusiness: "Retail",
        ...withMerchantDefaults(undefined),
      },
      registerLeadPorts(runtime),
    );

    expect(expectErr(blocked).code).toBe("pending_quotation_limit");
  });

  it("allows registration again after the executive resolves a pending quotation", async () => {
    const exec = actorBy("execOne");

    const leadIds = await fillPendingQuotations(runtime);

    // Closing one quotation as lost moves it out of PRICING, freeing a slot.
    const closed = await closeLeadCommand(
      { actor: exec, leadId: leadIds[0], reason: "RATE", note: null },
      workflowCommandPorts(runtime),
    );
    expect(closed.ok).toBe(true);

    const allowed = await registerLead(
      {
        actor: {
          userId: exec.userId,
          role: "executive",
          branchId: exec.branchId,
        },
        ruc: "20999999992",
        lineOfBusiness: "Retail",
        ...withMerchantDefaults(undefined),
      },
      registerLeadPorts(runtime),
    );

    expect(allowed.ok).toBe(true);
  });
});
