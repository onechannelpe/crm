"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "../commands/actor";

export async function querySourcingPolicy(rawBranchId: number) {
  return runAction({
    name: "workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId: rawBranchId }, validationFail, (r) => ({
        branchId: r.posInt("branchId"),
      })),

    audit: (query) => ({ branchId: query.branchId }),

    execute: ({ actor }, query) =>
      getServerRuntime().workflow.queries.getSourcingPolicy({
        actorRole: actor.role,
        branchId: query.branchId,
      }),
  });
}

export async function saveSourcingPolicy(input: {
  branchId: number;
  engineAssignmentEnabled: boolean;
}) {
  return runAction({
    name: "workflow.update_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.posInt("branchId"),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    audit: (command) => ({ branchId: command.branchId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.updateSourcingPolicy({
        actor: workflowActor(actor),
        branchId: payload.branchId,
        engineAssignmentEnabled: payload.engineAssignmentEnabled,
      }),
  });
}
