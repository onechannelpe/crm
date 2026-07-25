import { parseFieldChanges, type FieldChange } from "~/contracts/events";
import type { Json } from "~/contracts/json";
import type { EventId, UserId } from "~/domain/ids";
import type {
  LeadHistoryEntry,
  LeadHistoryPerson,
} from "~/server/workflow/lead/domain/history";

export type HistoryEventRow = {
  id: EventId;
  lead_id: string;
  event_type: LeadHistoryEntry["eventType"];
  actor_user_id: UserId | null;
  subject_user_id: UserId | null;
  payload_json: Json;
  changes_json: Json;
  occurred_at: Date;
  actor_names: string | null;
  actor_first_surname: string | null;
  actor_second_surname: string | null;
  subject_names: string | null;
  subject_first_surname: string | null;
  subject_second_surname: string | null;
};

export type HistoryEntryBase = {
  id: string;
  leadId: string;
  actorUserId: string | null;
  subjectUserId: string | null;
  changes: FieldChange[];
  occurredAt: number;
  actor: LeadHistoryPerson | null;
  subject: LeadHistoryPerson | null;
};

function toHistoryPerson(input: {
  names: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
}): LeadHistoryPerson | null {
  if (
    input.names === null &&
    input.firstSurname === null &&
    input.secondSurname === null
  ) {
    return null;
  }

  return {
    names: input.names,
    firstSurname: input.firstSurname,
    secondSurname: input.secondSurname,
  };
}

export function toHistoryEntryBase(row: HistoryEventRow): HistoryEntryBase {
  return {
    id: row.id,
    leadId: row.lead_id,
    actorUserId: row.actor_user_id,
    subjectUserId: row.subject_user_id,
    changes: parseFieldChanges(row.changes_json),
    occurredAt: row.occurred_at.getTime(),
    actor: toHistoryPerson({
      names: row.actor_names,
      firstSurname: row.actor_first_surname,
      secondSurname: row.actor_second_surname,
    }),
    subject: toHistoryPerson({
      names: row.subject_names,
      firstSurname: row.subject_first_surname,
      secondSurname: row.subject_second_surname,
    }),
  };
}
