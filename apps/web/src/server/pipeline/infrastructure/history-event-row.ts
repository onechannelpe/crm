import type {
  LeadHistoryEntry,
  LeadHistoryPerson,
} from "~/server/pipeline/domain/history";
import { asUserId, type LeadId, type UserId } from "~/server/shared/ids";

export type HistoryEventRow = {
  id: number;
  lead_id: LeadId;
  event_type: LeadHistoryEntry["eventType"];
  actor_user_id: string | null;
  subject_user_id: string | null;
  payload_json: string | null;
  occurred_at: number;
  actor_names: string | null;
  actor_first_surname: string | null;
  actor_second_surname: string | null;
  subject_names: string | null;
  subject_first_surname: string | null;
  subject_second_surname: string | null;
};

export type HistoryEntryBase = {
  id: number;
  leadId: LeadId;
  actorUserId: UserId | null;
  subjectUserId: UserId | null;
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
    actorUserId: row.actor_user_id ? asUserId(row.actor_user_id) : null,
    subjectUserId: row.subject_user_id ? asUserId(row.subject_user_id) : null,
    occurredAt: row.occurred_at,
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
