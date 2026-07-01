import type {
  WorkflowLeadId,
  WorkflowRateProposalId,
} from "~/server/shared/ids";
import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";

import type { TestActor } from "../database/workflow-fixtures";
import type { TestRuntime } from "../runtime/app";
import { workflowCommandPorts } from "./workflow-ports";

export async function proposePendingRate(
  runtime: TestRuntime,
  input: { leadId: WorkflowLeadId; backOffice: TestActor },
): Promise<{ proposalId: WorkflowRateProposalId }> {
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
