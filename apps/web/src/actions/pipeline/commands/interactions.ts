"use server";

import { validationError } from "~/lib/app-errors";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import type {
  AddLeadNoteInput,
  RecordLeadCallInput,
} from "~/server/pipeline/contracts/lead-interactions";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: RecordLeadCallInput) {
  return runAction({
    actionName: "pipeline.log_call",
    requireAuth: true,
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
        logCall({
          deps: deps.leadInteractions,
          auditService,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId: input.leadId,
          outcome: input.outcome,
          notes: input.notes ?? null,
        }),
      ),
  });
}

export async function addLeadNote(input: AddLeadNoteInput) {
  if (!input.body.trim()) {
    throw validationError("body is required");
  }

  return runAction({
    actionName: "pipeline.add_note",
    requireAuth: true,
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
        addNote({
          deps: deps.leadInteractions,
          auditService,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId: input.leadId,
          body: input.body,
        }),
      ),
  });
}
