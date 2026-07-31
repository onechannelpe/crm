import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { createInquiry } from "~/server/workflow/inquiry/create-inquiry";
import { workflowActor } from "~/server/workflow/ui/actor";
import { composeWorkflow } from "~/server/workflow/ui/composition";

export async function requestInquiryCreation(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.create_inquiry",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    execute: ({ actor }, payload) =>
      createInquiry(
        { ruc: payload.ruc, actor: workflowActor(actor) },
        composeWorkflow().ports(),
      ),
  });
}
