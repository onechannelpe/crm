"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { getSourcingPolicy } from "~/server/workflow/application/queries/get-sourcing-policy";
import { runWorkflowCommand } from "~/server/runtime/workflow-commands";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "workflow.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(
        {
          sourcingPolicies: getServerRuntime().workflow.repos.sourcingPolicies,
        },
        { actorRole: ctx.actor.role, branchId },
      ),
  });
}

export async function saveSourcingPolicy(input: {
  branchId: number;
  engineAssignmentEnabled: boolean;
}) {
  return runAction({
    actionName: "workflow.update_sourcing_policy",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runWorkflowCommand(({ useCases }) =>
        useCases.updateSourcingPolicy({
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: input.branchId,
          engineAssignmentEnabled: input.engineAssignmentEnabled,
        }),
      ),
  });
}
