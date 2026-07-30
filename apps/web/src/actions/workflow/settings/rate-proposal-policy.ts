"use server";

import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { getRateProposalPolicy } from "~/server/workflow/policy/read/get-rate-proposal-policy";
import { updateRateProposalPolicy } from "~/server/workflow/policy/write/update-rate-proposal-policy";

import { workflowActor } from "../commands/actor";

export async function queryRateProposalPolicy() {
  return runAction({
    name: "workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) => {
      const workflow = getWorkflowRuntime();

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
  return runAction({
    name: "workflow.update_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        validityDays: r.posInt("validityDays"),
      })),

    audit: ({ validityDays }) => ({ validityDays }),

    execute: ({ actor }, payload) => {
      const workflow = getWorkflowRuntime();

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
