import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { updateRateProposalPolicy } from "~/server/workflow/policy/write/update-rate-proposal-policy";
import { workflowActor } from "~/server/workflow/ui/actor";
import { composeWorkflow } from "~/server/workflow/ui/composition";

export async function saveRateProposalPolicy(input: { validityDays: number }) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.update_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },
    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        validityDays: reader.posInt("validityDays"),
      })),
    audit: ({ validityDays }) => ({ validityDays }),
    execute: ({ actor }, payload) => {
      const workflow = composeWorkflow();
      return updateRateProposalPolicy(
        {
          actor: workflowActor(actor),
          validityDays: payload.validityDays,
        },
        {
          rateProposalPolicies: workflow.repos.rateProposalPolicies,
          now: workflow.now(),
        },
      );
    },
  });
}
