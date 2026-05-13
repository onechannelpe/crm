"use server";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { LeadCallOutcome } from "~/workflow/contracts/lead-schema";

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
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
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
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        leadId: input.leadId,
        body: input.body,
      }),
  });
}
