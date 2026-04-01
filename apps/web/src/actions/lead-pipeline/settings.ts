"use server";

import {
  getSourcingPolicy as getSourcingPolicyUseCase,
  updateSourcingPolicy as updateSourcingPolicyUseCase,
} from "~/server/lead-pipeline/application/leads";
import { runAction } from "~/server/shared/action-runtime";

export async function getLeadSourcingPolicy(branchId: number) {
  return runAction({
    actionName: "lead_pipeline.get_sourcing_policy",
    permission: "capacity:policy:manage",
    input: { branchId },
    execute: (ctx) =>
      getSourcingPolicyUseCase({
        actorRole: ctx.actor.role,
        branchId,
      }),
  });
}

export async function updateLeadSourcingPolicy(input: {
  branchId: number;
  engineAssignmentEnabled: boolean;
}) {
  return runAction({
    actionName: "lead_pipeline.update_sourcing_policy",
    permission: "capacity:policy:manage",
    input,
    execute: (ctx) =>
      updateSourcingPolicyUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: input.branchId,
        engineAssignmentEnabled: input.engineAssignmentEnabled,
      }),
  });
}
