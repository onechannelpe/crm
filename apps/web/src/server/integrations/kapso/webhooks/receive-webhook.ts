import type { Insertable, Kysely } from "kysely";

import { notify } from "~/server/platform/database/notify";
import type { WhatsAppInboundEventsTable } from "~/server/platform/database/schema/modules/notifications.types";
import type { Database } from "~/server/platform/database/types";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

import {
  parseKapsoEnvelope,
  type KapsoEnvelope,
  type KapsoEnvelopeError,
} from "./kapso-envelope";

const INBOUND_EVENT = "whatsapp.message.received";
const DEFAULT_MAX_ATTEMPTS = 5;

type ReceiptError =
  | KapsoEnvelopeError
  | "missing-idempotency-key"
  | "unsupported-payload-version";

// Ignored events are acknowledged without being stored so Kapso does not retry.
export type KapsoWebhookReceipt = "accepted" | "duplicate" | "ignored";

function toEventRows(
  envelope: KapsoEnvelope,
  idempotencyKey: string,
  receivedAt: Date,
): Insertable<WhatsAppInboundEventsTable>[] {
  const base = {
    delivery_key: idempotencyKey,
    attempt_count: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    claimable_at: receivedAt,
    lease_owner: null,
    received_at: receivedAt,
  };

  const accepted = envelope.accepted.map((event) => ({
    ...base,
    id: event.id,
    conversation_id: event.conversationId,
    phone_number_id: event.phoneNumberId,
    sender_address: event.senderAddress,
    body: event.body,
    provider_timestamp: event.providerTimestamp,
    payload_json: event.payloadJson,
    queue_state: "pending" as const,
    outcome: null,
    error_message: null,
    completed_at: null,
  }));

  const quarantined = envelope.quarantined.map((event) => ({
    ...base,
    id: event.id,
    conversation_id: event.conversationId,
    phone_number_id: event.phoneNumberId,
    sender_address: event.senderAddress,
    body: event.body,
    provider_timestamp: event.providerTimestamp ?? receivedAt,
    payload_json: event.payloadJson,
    queue_state: "failed" as const,
    outcome: event.reason,
    error_message: event.reason,
    completed_at: receivedAt,
  }));

  return [...accepted, ...quarantined];
}

export async function receiveKapsoWebhook(
  db: Kysely<Database>,
  input: {
    idempotencyKey: string | null;
    eventType: string | null;
    payloadVersion: string | null;
    rawBody: string;
  },
  operation: OperationContext,
): Promise<Result<KapsoWebhookReceipt, ReceiptError>> {
  const idempotencyKey = input.idempotencyKey?.trim();

  if (!idempotencyKey || idempotencyKey.length > 256) {
    return Err("missing-idempotency-key");
  }

  const { eventType, payloadVersion } = input;

  if (eventType !== INBOUND_EVENT) {
    return Ok("ignored");
  }

  if (payloadVersion !== "v2") {
    return Err("unsupported-payload-version");
  }

  const envelope = parseKapsoEnvelope(input.rawBody, idempotencyKey);

  if (!envelope.ok) {
    return envelope;
  }

  const rows = toEventRows(
    envelope.value,
    idempotencyKey,
    operation.operationAt,
  );

  return db.transaction().execute(async (trx) => {
    const inserted = await trx
      .insertInto("kapso_webhook_deliveries")
      .values({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        payload_version: payloadVersion,
        is_batch: envelope.value.isBatch,
        payload_json: envelope.value.payloadJson,
        received_at: operation.operationAt,
      })
      .onConflict((oc) => oc.column("idempotency_key").doNothing())
      .returning("idempotency_key")
      .executeTakeFirst();

    if (!inserted) {
      return Ok("duplicate");
    }

    if (rows.length > 0) {
      // Message IDs also deduplicate batch fallback deliveries that use a new key.
      await trx
        .insertInto("whatsapp_inbound_events")
        .values(rows)
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }

    if (envelope.value.accepted.length > 0) {
      notify(trx, JOB_TABLE_CHANNELS.whatsapp_inbound_events);
    }

    return Ok("accepted");
  });
}
