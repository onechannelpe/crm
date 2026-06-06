"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "workflow.get_sourcing_policy",
    access: { kind: "auth" },
    input: { branchId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.queries.getSourcingPolicy({
        actorRole: actor.role,
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

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.updateSourcingPolicy({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        branchId: input.branchId,
        engineAssignmentEnabled: input.engineAssignmentEnabled,
      }),
  });
}
