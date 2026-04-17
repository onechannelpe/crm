import type { Insertable } from "kysely";

import type { Database } from "~/lib/db/types";
import {
  type LeadHistoryEntry,
  type LeadHistoryEventDraft,
} from "~/server/pipeline/domain/history";
import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { toHistoryEntry } from "./history-entry-parser";

type NewHistoryEventRow = Insertable<Database["pipeline_history_events"]>;

export function createHistoryRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadHistoryEventDraft): Promise<number> {
      const result = await db
        .insertInto("pipeline_history_events")
        .values({
          lead_id: values.leadId,
          event_type: values.eventType,
          actor_user_id: values.actorUserId,
          subject_user_id: values.subjectUserId,
          payload_json: values.payload ? JSON.stringify(values.payload) : null,
          occurred_at: values.occurredAt,
        } satisfies NewHistoryEventRow)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async listByLeadId(
      leadId: LeadId,
    ): Promise<Result<LeadHistoryEntry[], DomainError>> {
      const rows = await db
        .selectFrom("pipeline_history_events as event")
        .leftJoin("users as actor", "actor.id", "event.actor_user_id")
        .leftJoin("users as subject", "subject.id", "event.subject_user_id")
        .select([
          "event.id",
          "event.lead_id",
          "event.event_type",
          "event.actor_user_id",
          "event.subject_user_id",
          "event.payload_json",
          "event.occurred_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
          "subject.names as subject_names",
          "subject.first_surname as subject_first_surname",
          "subject.second_surname as subject_second_surname",
        ])
        .where("event.lead_id", "=", leadId)
        .orderBy("event.occurred_at", "desc")
        .execute();

      const entries: LeadHistoryEntry[] = [];
      for (const row of rows) {
        const entry = toHistoryEntry(row);
        if (!entry.ok) {
          return Err(entry.error);
        }
        entries.push(entry.value);
      }

      return Ok(entries);
    },
  };
}
