import { WorkflowLeadId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
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

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      application.workflow.commands.addLeadNote(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}
