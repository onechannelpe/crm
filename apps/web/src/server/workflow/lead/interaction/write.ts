import type {
  AddLeadNoteInput,
  LogLeadCallInput,
} from "~/contracts/workflow/inputs";
import { runResultTransaction } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import { toLeadEventAppend } from "~/server/workflow/lead/write/lead-events";
import { createLeadStateRepo } from "~/server/workflow/lead/write/lead-state-repo";

import { recordCall, recordNote } from "./domain";

type Ports = {
  executor: DatabaseExecutor;
  now: number;
};

async function commitInteraction(
  tx: DatabaseExecutor,
  input: {
    actor: {
      userId: number;
    };
    leadId: string;
  },
  events: LeadEvent[],
  now: number,
): Promise<Result<{ interactionId: string }, DomainError>> {
  const eventIds = await createEventsRepo(tx).append(
    events.map(toLeadEventAppend),
  );

  const updateResult = await tx
    .updateTable("workflow_leads")
    .set({
      updated_by: input.actor.userId,
      updated_at: now,
    })
    .where("id", "=", input.leadId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();

  if (Number(updateResult.numUpdatedRows) === 0) {
    return Err(fail("lead_not_found"));
  }

  return Ok({ interactionId: eventIds[0] });
}

function runInteractionTransaction(
  ports: Ports,
  operation: (
    tx: DatabaseExecutor,
  ) => Promise<Result<{ interactionId: string }, DomainError>>,
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runResultTransaction(
    (transaction) => ports.executor.transaction().execute(transaction),
    operation,
  );
}

export async function addLeadNote(
  input: AddLeadNoteInput & {
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runInteractionTransaction(ports, async (tx) => {
    const state = await createLeadStateRepo(tx).findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const events = recordNote(state, {
      actor: input.actor,
      body: input.body,
      now: ports.now,
    });

    if (isErr(events)) {
      return Err(events.error);
    }

    return commitInteraction(tx, input, events.value, ports.now);
  });
}

export async function logLeadCall(
  input: LogLeadCallInput & {
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  return runInteractionTransaction(ports, async (tx) => {
    const state = await createLeadStateRepo(tx).findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const events = recordCall(state, {
      actor: input.actor,
      outcome: input.outcome,
      notes: input.notes?.trim() ?? null,
      now: ports.now,
    });

    if (isErr(events)) {
      return Err(events.error);
    }

    return commitInteraction(tx, input, events.value, ports.now);
  });
}
