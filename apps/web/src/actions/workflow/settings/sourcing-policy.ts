"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { getSourcingPolicy } from "~/server/workflow/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/workflow/application/settings/update-sourcing-policy";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "workflow.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(getServerRuntime().workflow.deps.sourcingPolicy, {
        actorRole: ctx.actor.role,
        branchId,
      }),
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
      runWorkflowCommand(({ deps }) =>
        updateSourcingPolicy(deps.sourcingPolicy, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: input.branchId,
          engineAssignmentEnabled: input.engineAssignmentEnabled,
        }),
      ),
  });
}
