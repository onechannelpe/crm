import { WorkflowLeadId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";

export async function addLeadNote(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.add_note",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        body: r.str("body"),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.addLeadNote(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}
