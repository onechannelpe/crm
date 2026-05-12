import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import {
  toCommercialScopeEntry,
  toQuotationEntry,
  toRepLegalEntry,
  toRequestQuotationEntry,
  toVenueAddedEntry,
} from "./history-commercial-parser";
import type { HistoryEventRow } from "./history-event-row";
import { toHistoryEntryBase } from "./history-event-row";
import { toCallEntry, toNoteEntry } from "./history-interaction-parser";
import {
  toAssignmentEntry,
  toPriorityUpdatedEntry,
  toReassignmentEntry,
  toRegisteredEntry,
  toReviewedEntry,
  toStatusUpdatedEntry,
  toStageChangeEntry,
} from "./history-lifecycle-parser";
import { parsePayload, requireString } from "./history-payload-fields";

export type { HistoryEventRow };

export function toHistoryEntry(
  row: HistoryEventRow,
): Result<LeadHistoryEntry, DomainError> {
  const payload = parsePayload(row);
  if (!payload.ok) return payload;

  switch (row.event_type) {
    case "lead_registered":
      return toRegisteredEntry(row, payload.value);
    case "lead_status_updated":
      return toStatusUpdatedEntry(row, payload.value);
    case "lead_priority_updated":
      return toPriorityUpdatedEntry(row, payload.value);
    case "lead_reviewed":
      return toReviewedEntry(row, payload.value);
    case "workflow_stage_changed":
      return toStageChangeEntry(row, payload.value);
    case "lead_assigned":
      return toAssignmentEntry(row, payload.value);
    case "lead_reassigned":
      return toReassignmentEntry(row, payload.value);
    case "commercial_scope_saved":
      return toCommercialScopeEntry(row, payload.value);
    case "quotation_requested":
      return toRequestQuotationEntry(row);
    case "rep_legal_recorded":
      return toRepLegalEntry(row, payload.value);
    case "quotation_created":
      return toQuotationEntry(row, payload.value);
    case "sale_approved":
      return Ok({
        ...toHistoryEntryBase(row),
        eventType: "sale_approved",
        payload: null,
      });
    case "venue_added":
      return toVenueAddedEntry(row, payload.value);
    case "venue_accounts_added": {
      const venueId = requireString(payload.value, "venueId", row);
      if (!venueId.ok) return venueId;
      return Ok({
        ...toHistoryEntryBase(row),
        eventType: "venue_accounts_added",
        payload: { venueId: venueId.value },
      });
    }
    case "call_logged":
      return toCallEntry(row, payload.value);
    case "note_added":
      return toNoteEntry(row, payload.value);
    default: {
      const exhaustive: never = row.event_type;
      return exhaustive;
    }
  }
}
