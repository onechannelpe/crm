import type {
  AddLeadNoteInput,
  LogLeadCallInput,
} from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { runLeadTransaction } from "~/server/workflow/lead/write/transition";

import { recordCall, recordNote } from "./domain";

type Ports = {
  executor: DatabaseExecutor;
  now: number;
};

export async function addLeadNote(
  input: AddLeadNoteInput & {
    actor: WorkflowActor;
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

export async function logLeadCall(
  input: LogLeadCallInput & {
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const events = recordCall(state, {
      actor: input.actor,
      outcome: input.outcome,
      notes: input.notes?.trim() ?? null,
      now: ctx.now,
    });
    if (isErr(events)) return Err(events.error);

    const appended = await ctx.appendFacts(events.value);
    if (!appended.ok) return appended;

    return Ok({ interactionId: appended.value.eventIds[0] });
  });
}
