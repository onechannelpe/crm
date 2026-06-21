"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { getSourcingPolicy } from "~/server/workflow/policy/read/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/workflow/policy/write/update-sourcing-policy";

import { workflowActor } from "../commands/actor";

export async function querySourcingPolicy(rawBranchId: number) {
  return runAction({
    name: "workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId: rawBranchId }, validationFail, (r) => ({
        branchId: r.posInt("branchId"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, query) => {
      const { sourcingPolicies } = getServerRuntime().workflow.repos;

      return getSourcingPolicy(
        { sourcingPolicies },
        {
          actorRole: actor.role,
          branchId: query.branchId,
        },
      );
    },
  });
}

export async function saveSourcingPolicy(input: {
  branchId: number;
  engineAssignmentEnabled: boolean;
}) {
  return runAction({
    name: "workflow.update_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.posInt("branchId"),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, command) => {
      const workflow = getServerRuntime().workflow;

      return updateSourcingPolicy(
        {
          actor: workflowActor(actor),
          branchId: command.branchId,
          engineAssignmentEnabled: command.engineAssignmentEnabled,
        },
        {
          sourcingPolicies: workflow.repos.sourcingPolicies,
          now: workflow.now(),
        },
      );
    },
  });
}
