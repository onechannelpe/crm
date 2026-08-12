import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";

export async function requestInquiryCreation(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.create_inquiry",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    execute: (ctx, payload) =>
      application.workflow.commands.createInquiry(
        { ruc: payload.ruc, actor: workflowActor(ctx.actor) },
        ctx,
      ),
  });
}
