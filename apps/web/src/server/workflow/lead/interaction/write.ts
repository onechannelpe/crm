import type { AddLeadNoteInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { WorkflowActor } from "~/server/workflow/actor";
import { runLeadTransaction } from "~/server/workflow/lead/write/transition";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import { recordNote } from "./domain";

type Ports = {
  executor: DatabaseExecutor;
  now: Date;
};

export async function addLeadNote(
  input: Omit<AddLeadNoteInput, "leadId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
  },
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const events = recordNote(state, {
      actor: input.actor,
      body: input.body,
      now: ctx.now,
    });
    if (isErr(events)) return Err(events.error);

    const appended = await ctx.appendFacts(events.value);
    if (!appended.ok) return appended;

    return Ok({ interactionId: appended.value.eventIds[0] });
  });
}
