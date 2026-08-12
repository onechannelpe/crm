import type { DomainError } from "~/domain/errors";
import { WorkflowVenueId } from "~/domain/ids";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import { Ok, type Result } from "~/shared/result";

import {
  toCommercialScopeCorrectedEntry,
  toRateAcceptedEntry,
  toRateProposalCorrectedEntry,
  toRateProposedEntry,
  toRateRevisionRequestedEntry,
  toRepLegalEntry,
  toVenueAddedEntry,
  toVenueUpdatedEntry,
} from "./history-commercial-parser";
import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import {
  toFulfillmentCompletedEntry,
  toFulfillmentDocumentUploadedEntry,
  toFulfillmentProductChosenEntry,
  toFulfillmentStartedEntry,
  toFulfillmentStepAdvancedEntry,
  toFulfillmentStepRejectedEntry,
} from "./history-fulfillment-parser";
import { toNoteEntry } from "./history-interaction-parser";
import {
  toAssignmentEntry,
  toLeadClosedEntry,
  toLeadDeletedEntry,
  toPriorityUpdatedEntry,
  toReassignmentEntry,
  toRegisteredEntry,
  toReservationExpiredEntry,
  toReviewedEntry,
  toStatusUpdatedEntry,
  toStageChangeEntry,
} from "./history-lifecycle-parser";
import { parsePayload, requireString } from "./history-payload-fields";

export function toHistoryEntry(
  row: HistoryEventRow,
): Result<LeadHistoryEntry, DomainError> {
  const payload = parsePayload(row);
  if (!payload.ok) {
    return payload;
  }

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
    case "rate_proposal_corrected":
      return toRateProposalCorrectedEntry(row, payload.value);
    case "commercial_scope_corrected":
      return toCommercialScopeCorrectedEntry(row);
    case "lead_closed":
      return toLeadClosedEntry(row, payload.value);
    case "lead_reservation_expired":
      return toReservationExpiredEntry(row, payload.value);
    case "venue_added":
      return toVenueAddedEntry(row, payload.value);
    case "venue_updated":
      return toVenueUpdatedEntry(row, payload.value);
    case "venue_accounts_added": {
      const venueId = requireString(payload.value, "venueId", row);
      if (!venueId.ok) {
        return venueId;
      }
      return Ok({
        ...toHistoryEntryBase(row),
        eventType: "venue_accounts_added",
        payload: { venueId: WorkflowVenueId.trust(venueId.value) },
      });
    }
    case "fulfillment_started":
      return toFulfillmentStartedEntry(row, payload.value);
    case "fulfillment_product_chosen":
      return toFulfillmentProductChosenEntry(row, payload.value);
    case "fulfillment_step_advanced":
      return toFulfillmentStepAdvancedEntry(row, payload.value);
    case "fulfillment_step_rejected":
      return toFulfillmentStepRejectedEntry(row, payload.value);
    case "fulfillment_document_uploaded":
      return toFulfillmentDocumentUploadedEntry(row, payload.value);
    case "fulfillment_completed":
      return toFulfillmentCompletedEntry(row);
    case "note_added":
      return toNoteEntry(row, payload.value);
    case "lead_deleted":
      return toLeadDeletedEntry(row);
    default: {
      const exhaustive: never = row.event_type;
      return exhaustive;
    }
  }
}
