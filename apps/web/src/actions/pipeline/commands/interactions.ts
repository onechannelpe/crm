"use server";

import { validationError } from "~/lib/app-errors";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import { createLeadInteractionDeps } from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import type {
  AddLeadNoteInput,
  RecordLeadCallInput,
} from "../contracts/lead-interactions";
import { runPipelineCommand } from "../runtime/commands";

export async function recordLeadCall(input: RecordLeadCallInput) {
  return runAction({
    actionName: "pipeline.log_call",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      runPipelineCommand(createLeadInteractionDeps, ({ deps, auditService }) =>
        logCall(deps, auditService, {
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
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      runPipelineCommand(createLeadInteractionDeps, ({ deps, auditService }) =>
        addNote(deps, auditService, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId: input.leadId,
          body: input.body,
        }),
      ),
  });
}
