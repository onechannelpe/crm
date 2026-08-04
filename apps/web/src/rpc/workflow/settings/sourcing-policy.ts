import { BranchId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";

export async function querySourcingPolicy(rawBranchId: string) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.get_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ branchId: rawBranchId }, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
      })),

    telemetry: ({ branchId }) => ({ branchId }),

    execute: ({ actor }, query) =>
      application.workflow.queries.getSourcingPolicy({
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
    name: "application.workflow.update_sourcing_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        branchId: r.id("branchId", BranchId),
        engineAssignmentEnabled: r.bool("engineAssignmentEnabled"),
      })),

    telemetry: ({ branchId }) => ({ branchId }),

    execute: (ctx, command) =>
      application.workflow.commands.updateSourcingPolicy(
        {
          actor: workflowActor(ctx.actor),
          branchId: command.branchId,
          engineAssignmentEnabled: command.engineAssignmentEnabled,
        },
        ctx,
      ),
  });
}
