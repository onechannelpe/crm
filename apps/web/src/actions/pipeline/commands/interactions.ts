"use server";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import type {
  AddNoteInput,
  LogCallInput,
} from "~/server/pipeline/application/commands/types/lead-interactions";
export type { LeadCallOutcome } from "~/server/pipeline/domain/lead";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: LogCallInput) {
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

export async function addLeadNote(input: AddNoteInput) {
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
