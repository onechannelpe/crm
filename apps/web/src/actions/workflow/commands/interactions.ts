"use server";

import type { LeadCallOutcome } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

import { parseAddLeadNoteInput } from "./input";

export async function recordLeadCall(input: {
  leadId: string;
  outcome: LeadCallOutcome;
  notes?: string | null;
}) {
  return runAction({
    actionName: "workflow.log_call",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.logLeadCall({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        outcome: input.outcome,
        notes: input.notes ?? null,
      }),
  });
}

export async function addLeadNote(input: unknown) {
  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseAddLeadNoteInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.addLeadNote({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        body: parsedInput.value.body,
      });
    },
  });
}
