import { Err, Ok, type Result } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

export type KapsoInboundEvent = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  providerTimestamp: Date;
  payloadJson: string;
};

export type QuarantinedInboundEvent = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  providerTimestamp: Date | null;
  reason: "unparseable-message";
  payloadJson: string;
};

export type KapsoEnvelope = {
  isBatch: boolean;
  accepted: KapsoInboundEvent[];
  quarantined: QuarantinedInboundEvent[];
  payloadJson: string;
};

export type KapsoEnvelopeError = "invalid-json" | "invalid-envelope";

type ParsedMessageFields = {
  id: string;
  conversationId: string;
  phoneNumberId: string;
  senderAddress: string;
  body: string | null;
  providerTimestamp: Date;
};

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value);
  const milliseconds = /^\d+$/.test(text)
    ? Number(text) * 1_000
    : Date.parse(text);

  if (!Number.isFinite(milliseconds)) {
    return null;
  }

  return new Date(milliseconds);
}

function parseMessageFields(payload: unknown): ParsedMessageFields | null {
  if (!isPlainRecord(payload)) {
    return null;
  }

  const message = isPlainRecord(payload["message"]) ? payload["message"] : null;
  const conversation = isPlainRecord(payload["conversation"])
    ? payload["conversation"]
    : null;
  const kapso =
    message && isPlainRecord(message["kapso"]) ? message["kapso"] : null;

  if (!message || !conversation || !kapso) {
    return null;
  }

  if (kapso["direction"] !== "inbound") {
    return null;
  }

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

  if (!isPlainRecord(payload)) {
    return Err("invalid-envelope");
  }

  const isBatch = payload["batch"] === true;
  const rawEvents = isBatch ? payload["data"] : [payload];

  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return Err("invalid-envelope");
  }

  const accepted: KapsoInboundEvent[] = [];
  const quarantined: QuarantinedInboundEvent[] = [];

  for (const [index, item] of rawEvents.entries()) {
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

      continue;
    }

    accepted.push({
      ...fields,
      payloadJson,
    });
  }

  return Ok({
    isBatch,
    accepted,
    quarantined,
    payloadJson: rawBody,
  });
}
