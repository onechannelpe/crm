import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";
import { workflow } from "~/server/workflow/ui/composition";

export async function requestInquiryCreation(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.create_inquiry",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.createInquiry(
        { ruc: payload.ruc, actor: workflowActor(actor) },
        now,
      ),
  });
}
