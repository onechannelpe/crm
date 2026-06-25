import { expectErr } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  registerLeadPorts,
  workflowCommandPorts,
} from "@tests/support/workflow/deps";
import { proposePendingRate } from "@tests/support/workflow/pricing";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { withMerchantDefaults } from "@tests/support/workflow/seed";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_PENDING_QUOTATION_DECISIONS } from "~/contracts/workflow/limits";
import { closeLeadCommand } from "~/server/workflow/lead/commands/close-lead";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";

async function fillPendingQuotations(
  runtime: TestRuntime,
  scenario: ReturnType<typeof createWorkflowScenario>,
): Promise<string[]> {
  const backOffice = scenario.actor.by("backOne");
  const leadIds: string[] = [];
  // Each lead reaches PRICING with a pending proposal awaiting the executive's
  // decision, which is exactly what the cap counts.
  for (let i = 0; i < MAX_PENDING_QUOTATION_DECISIONS; i++) {
    const lead = await scenario.lead.atStage("PRICING");
    await proposePendingRate(runtime, { leadId: lead.id, backOffice });
    leadIds.push(lead.id);
  }
  return leadIds;
}

describe("pending quotation registration cap", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-pending-cap");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("blocks a new registration once the executive holds the max pending quotation decisions", async () => {
    const scenario = createWorkflowScenario(runtime);
    const exec = scenario.actor.by("execOne");

    await fillPendingQuotations(runtime, scenario);

    const blocked = await registerLead(
      {
        actor: {
          userId: exec.userId,
          role: "executive",
          branchId: exec.branchId,
        },
        ruc: "20999999991",
        giroNegocio: "Retail",
        ...withMerchantDefaults(undefined),
      },
      registerLeadPorts(runtime),
    );

    expect(expectErr(blocked).code).toBe("pending_quotation_limit");
  });

  it("allows registration again after the executive resolves a pending quotation", async () => {
    const scenario = createWorkflowScenario(runtime);
    const exec = scenario.actor.by("execOne");

    const leadIds = await fillPendingQuotations(runtime, scenario);

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
        giroNegocio: "Retail",
        ...withMerchantDefaults(undefined),
      },
      registerLeadPorts(runtime),
    );

    expect(allowed.ok).toBe(true);
  });
});
