"use server";
import { workflowActorFrom } from "~/actions/workflow/shared";
import type { LeadCallOutcome } from "~/contracts/workflow";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function recordLeadCall(input: {
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
}) {
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

export async function addLeadNote(input: { leadId: string; body: string }) {
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
