import {
  FULFILLMENT_ACTIONS,
  FULFILLMENT_DOC_KINDS,
  FULFILLMENT_STEPS,
  PRODUCT_KINDS,
} from "~/contracts/workflow/vocabulary";
import type { DomainError } from "~/domain/errors";
import { FileAssetId, FulfillmentOrderId } from "~/domain/ids";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import { parseVocabularyValue } from "~/server/workflow/lead/domain/parse";
import { Ok, type Result } from "~/shared/result";

import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import {
  parsePayload,
  requireNumber,
  requireString,
} from "./history-payload-fields";

export function toFulfillmentStartedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const orderId = requireString(payload, "orderId", row);
  if (!orderId.ok) return orderId;
  const unitCount = requireNumber(payload, "unitCount", row);
  if (!unitCount.ok) return unitCount;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_started",
    payload: {
      orderId: FulfillmentOrderId.trust(orderId.value),
      unitCount: unitCount.value,
    },
  });
}

export function toFulfillmentProductChosenEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const orderId = requireString(payload, "orderId", row);
  if (!orderId.ok) return orderId;
  const kind = requireString(payload, "productKind", row);
  if (!kind.ok) return kind;
  const productKind = parseVocabularyValue(
    kind.value,
    PRODUCT_KINDS,
    "invalid_product_kind",
  );
  if (!productKind.ok) return productKind;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_product_chosen",
    payload: {
      orderId: FulfillmentOrderId.trust(orderId.value),
      productKind: productKind.value,
    },
  });
}

export function toFulfillmentStepAdvancedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const orderId = requireString(payload, "orderId", row);
  if (!orderId.ok) return orderId;
  const fromValue = requireString(payload, "from", row);
  if (!fromValue.ok) return fromValue;
  const toValue = requireString(payload, "to", row);
  if (!toValue.ok) return toValue;
  const actionValue = requireString(payload, "action", row);
  if (!actionValue.ok) return actionValue;

  const from = parseVocabularyValue(
    fromValue.value,
    FULFILLMENT_STEPS,
    "invalid_fulfillment_step",
  );
  if (!from.ok) return from;
  const to = parseVocabularyValue(
    toValue.value,
    FULFILLMENT_STEPS,
    "invalid_fulfillment_step",
  );
  if (!to.ok) return to;
  const action = parseVocabularyValue(
    actionValue.value,
    FULFILLMENT_ACTIONS,
    "invalid_fulfillment_action",
  );
  if (!action.ok) return action;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_step_advanced",
    payload: {
      orderId: FulfillmentOrderId.trust(orderId.value),
      from: from.value,
      to: to.value,
      action: action.value,
    },
  });
}

export function toFulfillmentStepRejectedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const orderId = requireString(payload, "orderId", row);
  if (!orderId.ok) return orderId;
  const fromValue = requireString(payload, "from", row);
  if (!fromValue.ok) return fromValue;
  const toValue = requireString(payload, "to", row);
  if (!toValue.ok) return toValue;
  const reason = requireString(payload, "reason", row);
  if (!reason.ok) return reason;

  const from = parseVocabularyValue(
    fromValue.value,
    FULFILLMENT_STEPS,
    "invalid_fulfillment_step",
  );
  if (!from.ok) return from;
  const to = parseVocabularyValue(
    toValue.value,
    FULFILLMENT_STEPS,
    "invalid_fulfillment_step",
  );
  if (!to.ok) return to;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_step_rejected",
    payload: {
      orderId: FulfillmentOrderId.trust(orderId.value),
      from: from.value,
      to: to.value,
      reason: reason.value,
    },
  });
}

export function toFulfillmentDocumentUploadedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const orderId = requireString(payload, "orderId", row);
  if (!orderId.ok) return orderId;
  const fileAssetId = requireString(payload, "fileAssetId", row);
  if (!fileAssetId.ok) return fileAssetId;
  const docKindValue = requireString(payload, "docKind", row);
  if (!docKindValue.ok) return docKindValue;
  const docKind = parseVocabularyValue(
    docKindValue.value,
    FULFILLMENT_DOC_KINDS,
    "invalid_fulfillment_doc_kind",
  );
  if (!docKind.ok) return docKind;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_document_uploaded",
    payload: {
      orderId: FulfillmentOrderId.trust(orderId.value),
      docKind: docKind.value,
      fileAssetId: FileAssetId.trust(fileAssetId.value),
    },
  });
}

export function toFulfillmentCompletedEntry(
  row: HistoryEventRow,
): Result<LeadHistoryEntry, DomainError> {
  const payload = parsePayload(row);
  if (!payload.ok) return payload;
  const orderId = requireString(payload.value, "orderId", row);
  if (!orderId.ok) return orderId;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "fulfillment_completed",
    payload: { orderId: FulfillmentOrderId.trust(orderId.value) },
  });
}
