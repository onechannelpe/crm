import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, Ok, type Result } from "~/server/shared/result";
import { createLeadStateRepo } from "~/server/workflow/infrastructure/lead-state-repo";
import { toLeadEventAppend } from "~/server/workflow/lead/write/lead-events";
import type {
  AddLeadNoteCommandInput,
  LogLeadCallCommandInput,
} from "~/server/workflow/types";

import { recordCall, recordNote } from "./domain";

type Ports = { executor: DatabaseExecutor; now: number };

// Append-only write: load the lead to authorize, then append the interaction
// event to the spine. No transaction envelope and no version bump, because an
// interaction does not mutate aggregate state.
export async function addLeadNote(
  input: AddLeadNoteCommandInput,
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  const state = await createLeadStateRepo(ports.executor).findById(
    input.leadId,
  );
  if (!state) return Err(fail("lead_not_found"));

  const events = recordNote(state, {
    actor: input.actor,
    body: input.body,
    now: ports.now,
  });
  if (!events.ok) return events;

  const eventIds = await createEventsRepo(ports.executor).append(
    events.value.map(toLeadEventAppend),
  );
  return Ok({ interactionId: eventIds[0] });
}

export async function logLeadCall(
  input: LogLeadCallCommandInput,
  ports: Ports,
): Promise<Result<{ interactionId: string }, DomainError>> {
  const state = await createLeadStateRepo(ports.executor).findById(
    input.leadId,
  );
  if (!state) return Err(fail("lead_not_found"));

  const events = recordCall(state, {
    actor: input.actor,
    outcome: input.outcome,
    notes: input.notes?.trim() ?? null,
    now: ports.now,
  });
  if (!events.ok) return events;

  const eventIds = await createEventsRepo(ports.executor).append(
    events.value.map(toLeadEventAppend),
  );
  return Ok({ interactionId: eventIds[0] });
}
