"use server";

import { validationError } from "~/lib/app-errors";
import type { LeadCallOutcome } from "~/lib/db/types";
import { addNote } from "~/server/pipeline/application/commands/add-note";
import { logCall } from "~/server/pipeline/application/commands/log-call";
import { runAction } from "~/server/shared/action-runtime";

import { runPipelineCommand } from "../runtime";

export async function recordLeadCall(input: {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
}) {
  return runAction({
    actionName: "pipeline.log_call",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
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

export async function addLeadNote(input: { leadId: number; body: string }) {
  if (!input.body.trim()) {
    throw validationError("body is required");
  }

  return runAction({
    actionName: "pipeline.add_note",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
        addNote(deps, auditService, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId: input.leadId,
          body: input.body,
        }),
      ),
  });
}
