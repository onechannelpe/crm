import type { DomainError } from "~/domain/errors";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import { Ok, type Result } from "~/shared/result";

import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import { requireString } from "./history-payload-fields";

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
