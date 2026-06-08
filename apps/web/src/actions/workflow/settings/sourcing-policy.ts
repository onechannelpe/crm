"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "../commands/actor";

export async function querySourcingPolicy(branchId: number) {
  return runAction({
    actionName: "workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId }, validationFail, (r) => ({
        branchId: r.num("branchId"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, { branchId }) =>
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

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.num("branchId"),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.updateSourcingPolicy({
        actor: workflowActor(actor),
        branchId: payload.branchId,
        engineAssignmentEnabled: payload.engineAssignmentEnabled,
      }),
  });
}
