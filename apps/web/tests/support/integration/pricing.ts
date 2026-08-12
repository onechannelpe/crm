import type { WorkflowLeadId, WorkflowRateProposalId } from "~/domain/ids";

import type { TestActor } from "../database/workflow-fixtures";
import { operationAt } from "../operation";
import type { TestRuntime } from "../runtime/app";

export async function proposePendingRate(
  runtime: TestRuntime,
  input: { leadId: WorkflowLeadId; backOffice: TestActor },
): Promise<{ proposalId: WorkflowRateProposalId }> {
  const result = await runtime.workflow.commands.proposeRate(
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
    operationAt(runtime.now.get()),
  );
  if (!result.ok) {
    throw new Error(`proposePendingRate failed (${result.error.code})`);
  }
  return { proposalId: result.value.proposalId };
}
