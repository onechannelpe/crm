"use server";

import type { LeadCallOutcome } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseRequiredLeadText } from "~/server/workflow/parsers";

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

export async function addLeadNote(input: { leadId: string; body: string }) {
  const parsedBody = parseRequiredLeadText(
    input.body,
    "note_body_required",
    "Note body is required",
  );

  if (!parsedBody.ok) {
    return parsedBody;
  }

  return runAction({
    actionName: "workflow.add_note",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.addLeadNote({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        body: parsedBody.value,
      }),
  });
}
