"use server";

import { getSourcingPolicy } from "~/server/pipeline/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/pipeline/application/settings/update-sourcing-policy";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createPipelineDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "pipeline.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(createPipelineDeps().sourcingPolicy, {
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
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps }) =>
        updateSourcingPolicy(deps.sourcingPolicy, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: input.branchId,
          engineAssignmentEnabled: input.engineAssignmentEnabled,
        }),
      ),
  });
}
