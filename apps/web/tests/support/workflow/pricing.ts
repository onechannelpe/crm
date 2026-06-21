import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";

import type { TestRuntime } from "../runtime/app";
import { workflowCommandPorts } from "./deps";
import type { ScenarioActor } from "./leads";

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
