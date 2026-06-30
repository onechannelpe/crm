"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { asWorkflowLeadId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { addLeadNote as addLeadNoteUseCase } from "~/server/workflow/lead/interaction/write";

import { workflowActor } from "./actor";

export async function addLeadNote(input: unknown) {
  return runAction({
    name: "workflow.add_note",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
        body: r.str("body"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      addLeadNoteUseCase(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}
