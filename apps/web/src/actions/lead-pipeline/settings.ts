"use server";

import {
  getSourcingPolicy,
  updateSourcingPolicy,
} from "~/server/lead-pipeline/application/settings";
import { runAction } from "~/server/shared/action-runtime";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "lead_pipeline.get_sourcing_policy",
    permission: "capacity:policy:manage",
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicy({
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
    actionName: "lead_pipeline.update_sourcing_policy",
    permission: "capacity:policy:manage",
    input,
    execute: (ctx) =>
      updateSourcingPolicy({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: input.branchId,
        engineAssignmentEnabled: input.engineAssignmentEnabled,
      }),
  });
}
