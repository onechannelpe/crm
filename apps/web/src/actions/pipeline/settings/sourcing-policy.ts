"use server";

import { getSourcingPolicy } from "~/server/pipeline/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/pipeline/application/settings/update-sourcing-policy";
import { createSourcingPolicyDeps } from "~/server/pipeline/infrastructure/deps";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "pipeline.get_sourcing_policy",
    requireAuth: true,
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(createSourcingPolicyDeps(), {
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
    actionName: "pipeline.update_sourcing_policy",
    requireAuth: true,
    input,
    execute: (ctx) =>
      runPipelineCommand(createSourcingPolicyDeps, ({ deps }) =>
        updateSourcingPolicy(deps, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: input.branchId,
          engineAssignmentEnabled: input.engineAssignmentEnabled,
        }),
      ),
  });
}
