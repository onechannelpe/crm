"use server";

import { WorkflowLeadId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import { addLeadNote as addLeadNoteUseCase } from "~/server/workflow/lead/interaction/write";

import { workflowActor } from "./actor";

export async function addLeadNote(input: unknown) {
  return executeSessionServerFunction({
    name: "workflow.add_note",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        body: r.str("body"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      addLeadNoteUseCase(
        { actor: workflowActor(actor), ...payload },
        getWorkflowRuntime().ports(),
      ),
  });
}
