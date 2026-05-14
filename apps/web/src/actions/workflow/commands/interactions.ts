"use server";

import {
  toAddLeadNoteInput,
  toLogLeadCallInput,
} from "~/actions/workflow/mappers";
import type { AddLeadNoteInput, LogLeadCallInput } from "~/contracts/workflow";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: LogLeadCallInput) {
  return runAction({
    actionName: "workflow.log_call",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.logLeadCall(
        toLogLeadCallInput(ctx, input),
      ),
  });
}

export async function addLeadNote(input: AddLeadNoteInput) {
  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.addLeadNote(
        toAddLeadNoteInput(ctx, input),
      ),
  });
}
