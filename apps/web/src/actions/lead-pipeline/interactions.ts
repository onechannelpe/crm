"use server";

import { validationError } from "~/lib/app-errors";
import type { LeadCallOutcome } from "~/lib/db/types";
import { logLeadInteraction } from "~/server/lead-pipeline/application/interactions";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
}) {
  return runAction({
    actionName: "lead_pipeline.log_call",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteraction({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "call",
        outcome: input.outcome,
        bodyText: input.notes ?? null,
      }),
  });
}

export async function recordLeadNote(input: { leadId: number; body: string }) {
  if (!input.body.trim()) {
    throw validationError("body is required");
  }

  return runAction({
    actionName: "lead_pipeline.add_note",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteraction({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "note",
        bodyText: input.body,
      }),
  });
}
