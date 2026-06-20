"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "../commands/actor";

export async function queryRateProposalPolicy() {
  return runAction({
    name: "workflow.get_rate_proposal_policy",
    access: { kind: "permission", permission: "quotation:policy:manage" },

    audit: () => ({}),

    execute: ({ actor }) =>
      getServerRuntime().workflow.queries.getRateProposalPolicy({
        actorRole: actor.role,
        branchId: actor.branchId,
      }),
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

    audit: (command) => ({ validityDays: command.validityDays }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.updateRateProposalPolicy({
        actor: workflowActor(actor),
        validityDays: payload.validityDays,
      }),
  });
}
