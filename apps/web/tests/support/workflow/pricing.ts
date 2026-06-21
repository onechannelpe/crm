import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";

import type { TestRuntime } from "../runtime/app";
import { workflowCommandPorts } from "./deps";
import type { ScenarioActor } from "./leads";

// Drives a back-office rate proposal through the real command, leaving the lead with a
// pending proposal and an armed reservation hold (validity stamped by proposeRate, not by
// hand). Use after atStage("PRICING") to set up executive-side flows (request-revision,
// accept, expiry) the way production actually reaches them.
export async function proposePendingRate(
  runtime: TestRuntime,
  input: { leadId: string; backOffice: ScenarioActor },
): Promise<{ proposalId: string }> {
  const result = await proposeRateCommand(
    {
      actor: input.backOffice,
      leadId: input.leadId,
      proposedDebitRate: 1.5,
      proposedCreditRate: 2.5,
      proposedForeignRate: 3.5,
      fee: 0.6,
      paybackPricing: 11,
      currency: "PEN",
    },
    workflowCommandPorts(runtime),
  );
  if (!result.ok) {
    throw new Error(`proposePendingRate failed (${result.error.code})`);
  }
  return { proposalId: result.value.proposalId };
}
