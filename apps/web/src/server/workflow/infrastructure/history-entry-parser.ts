import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import {
  toRateAcceptedEntry,
  toRateProposedEntry,
  toRateRevisionRequestedEntry,
  toRepLegalEntry,
  toVenueAddedEntry,
  toVenueUpdatedEntry,
} from "./history-commercial-parser";
import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
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
    case "rep_legal_recorded":
      return toRepLegalEntry(row, payload.value);
    case "rate_proposed":
      return toRateProposedEntry(row, payload.value);
    case "rate_revision_requested":
      return toRateRevisionRequestedEntry(row, payload.value);
    case "rate_accepted":
      return toRateAcceptedEntry(row, payload.value);
    case "venue_added":
      return toVenueAddedEntry(row, payload.value);
    case "venue_updated":
      return toVenueUpdatedEntry(row, payload.value);
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
