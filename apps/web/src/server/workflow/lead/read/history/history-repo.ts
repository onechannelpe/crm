import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import { unknownLeadEventType } from "~/server/workflow/domain/integrity-errors";
import {
  isLeadHistoryEventType,
  type LeadHistoryEntry,
} from "~/server/workflow/lead/domain/history";

import { toHistoryEntry } from "./history-entry-parser";

export function createHistoryRepo(db: DatabaseExecutor) {
  return {
    async listByLeadId(
      leadId: string,
    ): Promise<Result<LeadHistoryEntry[], DomainError>> {
      const rows = await db
        .selectFrom("events as event")
        .leftJoin("users as actor", "actor.id", "event.actor_user_id")
        .leftJoin("users as subject", "subject.id", "event.subject_user_id")
        .select([
          "event.id",
          "event.entity_id as lead_id",
          "event.type as event_type",
          "event.actor_user_id",
          "event.subject_user_id",
          "event.payload_json",
          "event.changes_json",
          "event.occurred_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
          "subject.names as subject_names",
          "subject.first_surname as subject_first_surname",
          "subject.second_surname as subject_second_surname",
        ])
        .where("event.entity_type", "=", "lead")
        .where("event.entity_id", "=", leadId)
        .orderBy("event.occurred_at", "desc")
        .execute();

      const entries: LeadHistoryEntry[] = [];
      for (const row of rows) {
        if (!isLeadHistoryEventType(row.event_type)) {
          return unknownLeadEventType({ id: row.id, type: row.event_type });
        }
        const entry = toHistoryEntry({ ...row, event_type: row.event_type });
        if (!entry.ok) {
          return Err(entry.error);
        }
        entries.push(entry.value);
      }

      return Ok(entries);
    },
  };
}
