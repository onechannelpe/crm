import type { UserId, LeadId, BranchId } from "~/server/shared/ids";
("use server");

import { getSourcingPolicy } from "~/server/pipeline/application/queries/get-sourcing-policy";
import { updateSourcingPolicy } from "~/server/pipeline/application/settings/update-sourcing-policy";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: BranchId) {
  return runAction({
    actionName: "pipeline.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy(serverRuntime.pipeline.deps.sourcingPolicy, {
        actorRole: ctx.actor.role,
        branchId,
      }),
  });
}

export async function saveSourcingPolicy(input: {
  branchId: BranchId;
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
