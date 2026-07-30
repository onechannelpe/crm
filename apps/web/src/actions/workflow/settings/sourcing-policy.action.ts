import { BranchId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getSourcingPolicy } from "~/server/workflow/policy/read/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/workflow/policy/write/update-sourcing-policy";
import { composeWorkflow } from "~/server/workflow/ui/composition";

import { workflowActor } from "~/server/workflow/ui/actor";

export async function querySourcingPolicy(rawBranchId: string) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId: rawBranchId }, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, query) => {
      const { sourcingPolicies } = composeWorkflow().repos;

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
  branchId: string;
  engineAssignmentEnabled: boolean;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.update_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, command) => {
      const workflow = composeWorkflow();

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
