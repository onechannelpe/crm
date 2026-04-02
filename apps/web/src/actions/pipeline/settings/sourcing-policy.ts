"use server";

import { getSourcingPolicy } from "~/server/pipeline/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/pipeline/application/settings/update-sourcing-policy";
import { runAction } from "~/server/shared/action-runtime";

import { createPipelineQueryRuntime, runPipelineCommand } from "../runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "pipeline.get_sourcing_policy",
    permission: "capacity:policy:manage",
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(createPipelineQueryRuntime(), {
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
    permission: "capacity:policy:manage",
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps }) =>
        updateSourcingPolicy(deps, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: input.branchId,
          engineAssignmentEnabled: input.engineAssignmentEnabled,
        }),
      ),
  });
}
