import type { Insertable, Kysely } from "kysely";

import { notify } from "~/lib/db/notify";
import type { WhatsAppInboundEventsTable } from "~/lib/db/schema/modules/notifications.types";
import type { Database } from "~/lib/db/types";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  parseKapsoEnvelope,
  type KapsoEnvelope,
  type KapsoEnvelopeError,
} from "./kapso-envelope";

const INBOUND_EVENT = "whatsapp.message.received";
const DEFAULT_MAX_ATTEMPTS = 5;

type ReceiptError =
  | KapsoEnvelopeError
  | "invalid-event"
  | "missing-idempotency-key"
  | "unsupported-payload-version";

export type KapsoWebhookReceipt = "accepted" | "duplicate";

function toEventRows(
  envelope: KapsoEnvelope,
  idempotencyKey: string,
  now: Date,
): Insertable<WhatsAppInboundEventsTable>[] {
  const base = {
    delivery_key: idempotencyKey,
    attempt_count: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    available_at: now,
    lease_owner: null,
    lease_until: null,
    received_at: now,
  };

  const accepted = envelope.accepted.map((event) => ({
    ...base,
    id: event.id,
    conversation_id: event.conversationId,
    phone_number_id: event.phoneNumberId,
    sender_address: event.senderAddress,
    body: event.body,
    sequence: event.sequence,
    provider_timestamp: event.providerTimestamp,
    payload_json: event.payloadJson,
    queue_state: "pending" as const,
    outcome: null,
    error: null,
    processed_at: null,
  }));

  // Quarantined rows are failed with no sequence. The claim skips them, so later
  // messages are not blocked.
  const quarantined = envelope.quarantined.map((event) => ({
    ...base,
    id: event.id,
    conversation_id: event.conversationId,
    phone_number_id: event.phoneNumberId,
    sender_address: event.senderAddress,
    body: event.body,
    sequence: null,
    provider_timestamp: event.providerTimestamp ?? now,
    payload_json: event.payloadJson,
    queue_state: "failed" as const,
    outcome: event.reason,
    error: event.reason,
    processed_at: now,
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
    now: Date;
  },
): Promise<Result<KapsoWebhookReceipt, ReceiptError>> {
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length > 256) {
    return Err("missing-idempotency-key");
  }
  const { eventType, payloadVersion } = input;
  if (eventType !== INBOUND_EVENT) return Err("invalid-event");
  if (payloadVersion !== "v2") return Err("unsupported-payload-version");

  const envelope = parseKapsoEnvelope(input.rawBody, idempotencyKey);
  if (!envelope.ok) return envelope;

  const rows = toEventRows(envelope.value, idempotencyKey, input.now);

  return db.transaction().execute(async (trx) => {
    const inserted = await trx
      .insertInto("kapso_webhook_deliveries")
      .values({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        payload_version: payloadVersion,
        is_batch: envelope.value.isBatch,
        payload_json: envelope.value.payloadJson,
        received_at: input.now,
      })
      .onConflict((oc) => oc.column("idempotency_key").doNothing())
      .returning("idempotency_key")
      .executeTakeFirst();
    if (!inserted) return Ok("duplicate" as const);

    if (rows.length > 0) {
      // Dedup on the WhatsApp message id (PK) protects against Kapso's
      // documented batch-to-individual fallback re-delivering the same message
      // under a new idempotency key.
      await trx
        .insertInto("whatsapp_inbound_events")
        .values(rows)
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }

    if (envelope.value.accepted.length > 0) {
      notify(trx, JOB_TABLE_CHANNELS.whatsapp_inbound_events);
    }
    return Ok("accepted" as const);
  });
}
