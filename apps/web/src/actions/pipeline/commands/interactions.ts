"use server";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

import type {
  AddLeadNoteInput,
  RecordLeadCallInput,
} from "../contracts/lead-interactions";

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
