import { executeSessionServerFunction } from "~/server/platform/action";
import { getRateProposalPolicy } from "~/server/workflow/policy/read/get-rate-proposal-policy";
import { composeWorkflow } from "~/server/workflow/ui/composition";

export async function queryRateProposalPolicy() {
  return executeSessionServerFunction({
    name: "workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) => {
      const workflow = composeWorkflow();

      return getRateProposalPolicy(
        {
          rateProposalPolicies: workflow.repos.rateProposalPolicies,
        },
        {
          actorRole: actor.role,
          branchId: actor.branchId,
        },
      );
    },
  });
}
