import "server-only";

import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getRateProposalPolicy } from "~/server/workflow/policy/read/get-rate-proposal-policy";
import { updateRateProposalPolicy } from "~/server/workflow/policy/write/update-rate-proposal-policy";
import { composeWorkflow } from "~/server/workflow/ui/composition";

import { workflowActor } from "~/server/workflow/ui/actor";

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

export async function saveRateProposalPolicy(input: { validityDays: number }) {

  return executeSessionServerFunction({
    name: "workflow.update_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        validityDays: r.posInt("validityDays"),
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
