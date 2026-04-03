"use server";

import { getSourcingPolicy } from "~/server/pipeline/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/pipeline/application/settings/update-sourcing-policy";
import { createSourcingPolicyDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import { runPipelineCommand } from "../runtime/commands";
import { createPipelineQueryRuntime } from "../runtime/queries";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "pipeline.get_sourcing_policy",
    permission: "capacity:policy:manage",
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(createPipelineQueryRuntime(createSourcingPolicyDeps), {
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
