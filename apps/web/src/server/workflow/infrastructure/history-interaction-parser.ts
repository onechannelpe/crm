import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import {
  nullableString,
  requireCallOutcome,
  requireString,
} from "./history-payload-fields";

export function toCallEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const outcome = requireCallOutcome(payload, row);
  if (!outcome.ok) return outcome;

  const notes = nullableString(payload, "notes", row);
  if (!notes.ok) return notes;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "call_logged",
    payload: { outcome: outcome.value, notes: notes.value },
  });
}

export function toNoteEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const body = requireString(payload, "body", row);
  if (!body.ok) return body;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "note_added",
    payload: { body: body.value },
  });
}
