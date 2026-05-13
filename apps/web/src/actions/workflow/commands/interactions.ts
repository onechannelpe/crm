"use server";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/runtime/workflow-commands";
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
      runWorkflowCommand(({ useCases }) =>
        useCases.logLeadCall({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
          outcome: input.outcome,
          notes: input.notes ?? null,
        }),
      ),
  });
}

export async function addLeadNote(input: { leadId: string; body: string }) {
  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runWorkflowCommand(({ useCases }) =>
        useCases.addLeadNote({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
          body: input.body,
        }),
      ),
  });
}
