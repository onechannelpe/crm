import { BranchId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";
import { workflow } from "~/server/workflow/ui/composition";

export async function querySourcingPolicy(rawBranchId: string) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId: rawBranchId }, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, query) =>
      workflow.queries.getSourcingPolicy({
        actorRole: actor.role,
        branchId: query.branchId,
      }),
  });
}

export async function saveSourcingPolicy(input: {
  branchId: string;
  engineAssignmentEnabled: boolean;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.update_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    audit: ({ branchId }) => ({ branchId }),

    execute: ({ actor, operationAt: now }, command) =>
      workflow.commands.updateSourcingPolicy(
        {
          actor: workflowActor(actor),
          branchId: command.branchId,
          engineAssignmentEnabled: command.engineAssignmentEnabled,
        },
        now,
      ),
  });
}
