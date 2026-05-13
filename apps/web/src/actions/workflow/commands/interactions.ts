"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import type {
  AddLeadNoteInput,
  LogLeadCallInput,
} from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: LogLeadCallInput) {
  return runAction({
    actionName: "workflow.log_call",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.logLeadCall({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        outcome: input.outcome,
        notes: input.notes ?? null,
      }),
  });
}

export async function addLeadNote(input: AddLeadNoteInput) {
  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.addLeadNote({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        body: input.body,
      }),
  });
}
