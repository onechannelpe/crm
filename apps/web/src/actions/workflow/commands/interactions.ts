"use server";
import type { LeadCallOutcome } from "~/pipeline/contracts/lead-schema";
import { runAction } from "~/server/shared/action-runtime";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import { createWorkflowCommandApiRuntime } from "~/server/workflow/infrastructure/runtime/workflow-command-api-factory";

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
      runWorkflowCommand((runtime) =>
        createWorkflowCommandApiRuntime(runtime).logLeadCall({
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
      runWorkflowCommand((runtime) =>
        createWorkflowCommandApiRuntime(runtime).addLeadNote({
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
