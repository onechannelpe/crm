import { isPlainRecord } from "~/lib/type-guards";
import { Err, Ok, type Result } from "~/server/shared/result";

export type KapsoInboundEvent = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  sequence: number;
  providerTimestamp: Date;
  payloadJson: string;
};

// Quarantined events are recorded as failed and never processed. Later messages
// can then pass the ordering check. `missing-sequence` means the delivery arrived
// without a usable batch_info sequence and cannot be safely ordered.
export type QuarantinedInboundEvent = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  providerTimestamp: Date | null;
  reason: "unparseable-message" | "missing-sequence";
  payloadJson: string;
};

export type KapsoEnvelope = {
  isBatch: boolean;
  accepted: KapsoInboundEvent[];
  quarantined: QuarantinedInboundEvent[];
  payloadJson: string;
};

export type KapsoEnvelopeError = "invalid-json" | "invalid-envelope";

type MessageFields = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  providerTimestamp: Date;
};

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  const milliseconds = /^\d+$/.test(text)
    ? Number(text) * 1_000
    : Date.parse(text);
  if (!Number.isFinite(milliseconds)) return null;
  return new Date(milliseconds);
}

function parseMessageFields(payload: unknown): MessageFields | null {
  if (!isPlainRecord(payload)) return null;
  const message = isPlainRecord(payload["message"]) ? payload["message"] : null;
  const conversation = isPlainRecord(payload["conversation"])
    ? payload["conversation"]
    : null;
  const kapso =
    message && isPlainRecord(message["kapso"]) ? message["kapso"] : null;
  if (!message || !conversation || !kapso) return null;
  if (kapso["direction"] !== "inbound") return null;

  const id = message["id"];
  const conversationId = conversation["id"];
  const senderAddress = conversation["phone_number"];
  const phoneNumberId = payload["phone_number_id"] ?? kapso["phone_number_id"];
  const providerTimestamp = parseTimestamp(message["timestamp"]);
  if (
    typeof id !== "string" ||
    typeof conversationId !== "string" ||
    typeof senderAddress !== "string" ||
    typeof phoneNumberId !== "string" ||
    !providerTimestamp
  ) {
    return null;
  }

  const text = isPlainRecord(message["text"]) ? message["text"] : null;
  const body = text && typeof text["body"] === "string" ? text["body"] : null;
  return {
    id,
    conversationId,
    phoneNumberId,
    senderAddress,
    body,
    providerTimestamp,
  };
}

// Recommended Kapso webhook config: Debounce Window 1s, Maximum Batch Size 50.
// Debouncing makes Kapso provide a contiguous batch_info sequence for ordering.
// The values must still match the received batch before the sequence is trusted.
function parseSequenceBase(
  payload: Record<string, unknown>,
  messageCount: number,
): number | null {
  const info = isPlainRecord(payload["batch_info"])
    ? payload["batch_info"]
    : null;
  if (!info) return null;
  const first = info["first_sequence"];
  const last = info["last_sequence"];
  const size = info["size"];
  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    typeof size !== "number"
  ) {
    return null;
  }
  if (size !== messageCount || last - first + 1 !== size) return null;
  return first;
}

export function parseKapsoEnvelope(
  rawBody: string,
  idempotencyKey: string,
): Result<KapsoEnvelope, KapsoEnvelopeError> {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Err("invalid-json");
  }
  if (!isPlainRecord(payload)) return Err("invalid-envelope");

  const isBatch = payload["batch"] === true;
  const rawEvents = isBatch ? payload["data"] : [payload];
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return Err("invalid-envelope");
  }

  const sequenceBase = isBatch
    ? parseSequenceBase(payload, rawEvents.length)
    : null;

  const accepted: KapsoInboundEvent[] = [];
  const quarantined: QuarantinedInboundEvent[] = [];

  rawEvents.forEach((item, index) => {
    const payloadJson = JSON.stringify(item);
    const fields = parseMessageFields(item);
    if (!fields) {
      const syntheticId = `quarantine:${idempotencyKey}:${index}`;
      quarantined.push({
        id: syntheticId,
        conversationId: syntheticId,
        phoneNumberId: "",
        senderAddress: "",
        body: null,
        providerTimestamp: null,
        reason: "unparseable-message",
        payloadJson,
      });
      return;
    }
    if (sequenceBase === null) {
      quarantined.push({ ...fields, reason: "missing-sequence", payloadJson });
      return;
    }
    accepted.push({ ...fields, sequence: sequenceBase + index, payloadJson });
  });

  return Ok({ isBatch, accepted, quarantined, payloadJson: rawBody });
}
