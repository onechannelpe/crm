import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import type { HistoryEventRow } from "./history-event-row";
import { toHistoryEntryBase } from "./history-event-row";
import {
  optionalLeadPriority,
  optionalLeadStatus,
  optionalString,
  requireLeadPriority,
  requireLeadStage,
  requireLeadStatus,
  requireNumber,
  requireString,
} from "./history-payload-fields";

export function toRegisteredEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const ruc = requireString(payload, "ruc", row);
  if (!ruc.ok) return ruc;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_registered",
    payload: { ruc: ruc.value, toStage: "QUALIFYING" },
  });
}

export function toReviewedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const status = requireLeadStatus(payload, "status", row);
  if (!status.ok) return status;

  const prioridad = requireLeadPriority(payload, "prioridad", row);
  if (!prioridad.ok) return prioridad;

  const reason = requireString(payload, "reason", row);
  if (!reason.ok) return reason;

  const fromStage = requireLeadStage(payload, "fromStage", row);
  if (!fromStage.ok) return fromStage;

  const toStage = requireLeadStage(payload, "toStage", row);
  if (!toStage.ok) return toStage;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_reviewed",
    payload: {
      status: status.value,
      prioridad: prioridad.value,
      reason: reason.value,
      fromStage: fromStage.value,
      toStage: toStage.value,
    },
  });
}

export function toStatusUpdatedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const toStatus = requireLeadStatus(payload, "toStatus", row);
  if (!toStatus.ok) return toStatus;

  const reason = requireString(payload, "reason", row);
  if (!reason.ok) return reason;

  const fromStatus = optionalLeadStatus(payload, "fromStatus", row);
  if (!fromStatus.ok) return fromStatus;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_status_updated",
    payload: {
      fromStatus: fromStatus.value,
      toStatus: toStatus.value,
      reason: reason.value,
    },
  });
}

export function toPriorityUpdatedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const toPrioridad = requireLeadPriority(payload, "toPrioridad", row);
  if (!toPrioridad.ok) return toPrioridad;

  const reason = requireString(payload, "reason", row);
  if (!reason.ok) return reason;

  const fromPrioridad = optionalLeadPriority(payload, "fromPrioridad", row);
  if (!fromPrioridad.ok) return fromPrioridad;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_priority_updated",
    payload: {
      fromPrioridad: fromPrioridad.value,
      toPrioridad: toPrioridad.value,
      reason: reason.value,
    },
  });
}

export function toStageChangeEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const from = requireLeadStage(payload, "from", row);
  if (!from.ok) return from;

  const to = requireLeadStage(payload, "to", row);
  if (!to.ok) return to;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "workflow_stage_changed",
    payload: { from: from.value, to: to.value },
  });
}

export function toAssignmentEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const executiveId = requireNumber(payload, "executiveId", row);
  if (!executiveId.ok) return executiveId;

  const reason = optionalString(payload, "reason", row);
  if (!reason.ok) return reason;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_assigned",
    payload: { executiveId: executiveId.value, reason: reason.value },
  });
}

export function toReassignmentEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const fromExecutiveId = requireNumber(payload, "fromExecutiveId", row);
  if (!fromExecutiveId.ok) return fromExecutiveId;

  const toExecutiveId = requireNumber(payload, "toExecutiveId", row);
  if (!toExecutiveId.ok) return toExecutiveId;

  const reason = optionalString(payload, "reason", row);
  if (!reason.ok) return reason;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "lead_reassigned",
    payload: {
      fromExecutiveId: fromExecutiveId.value,
      toExecutiveId: toExecutiveId.value,
      reason: reason.value,
    },
  });
}
