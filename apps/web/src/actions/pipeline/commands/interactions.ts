"use server";
import type { LeadCallOutcome } from "~/actions/pipeline/contracts";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
}) {
  return runAction({
    actionName: "pipeline.log_call",
    access: { kind: "auth" },
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

export async function addLeadNote(input: { leadId: number; body: string }) {
  return runAction({
    actionName: "pipeline.add_note",
    access: { kind: "auth" },
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
