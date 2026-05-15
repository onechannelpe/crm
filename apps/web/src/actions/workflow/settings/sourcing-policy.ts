"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "workflow.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },
    execute: (ctx) =>
      getServerRuntime().workflow.queries.getSourcingPolicy({
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
      getServerRuntime().workflow.commands.updateSourcingPolicy({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        branchId: input.branchId,
        engineAssignmentEnabled: input.engineAssignmentEnabled,
      }),
  });
}
