"use server";
import type { LeadCallOutcome } from "~/pipeline/contracts/lead-schema";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { createPipelineCommandApiRuntime } from "~/server/pipeline/infrastructure/runtime/pipeline-command-api-factory";
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
      runPipelineCommand(({ deps, auditService, notificationCenter }) =>
        createPipelineCommandApiRuntime({
          deps,
          auditService,
          notificationCenter,
        }).logLeadCall({
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

export async function addLeadNote(input: { leadId: number; body: string }) {
  return runAction({
    actionName: "pipeline.add_note",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService, notificationCenter }) =>
        createPipelineCommandApiRuntime({
          deps,
          auditService,
          notificationCenter,
        }).addLeadNote({
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
