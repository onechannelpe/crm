import { createHmac, timingSafeEqual } from "node:crypto";

import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { isPlainRecord } from "~/lib/type-guards";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { openSession } from "~/server/notifications/whatsapp-session";
import { getServerRuntime } from "~/server/platform/container";

const logger = createLogger("whatsapp-webhook");

// Meta sends hub.mode=subscribe + hub.verify_token + hub.challenge.
// Echo back the challenge to confirm the endpoint.
export function GET(event: APIEvent): Response {
  const url = new URL(event.request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const { whatsappWebhookVerifyToken } = notificationsConfig();

  if (
    mode === "subscribe" &&
    challenge &&
    token === whatsappWebhookVerifyToken
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

function verifySignature(
  payload: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

function extractSenderPhones(body: unknown): string[] {
  if (!isPlainRecord(body) || body["object"] !== "whatsapp_business_account") {
    return [];
  }

  const phones: string[] = [];
  const entries = Array.isArray(body["entry"]) ? body["entry"] : [];

  for (const entry of entries) {
    if (!isPlainRecord(entry)) continue;
    const changes = Array.isArray(entry["changes"]) ? entry["changes"] : [];
    for (const change of changes) {
      if (!isPlainRecord(change) || change["field"] !== "messages") continue;
      const value = isPlainRecord(change["value"]) ? change["value"] : {};
      const messages = Array.isArray(value["messages"])
        ? value["messages"]
        : [];
      for (const msg of messages) {
        if (isPlainRecord(msg) && typeof msg["from"] === "string") {
          phones.push(msg["from"]);
        }
      }
    }
  }

  return phones;
}

export async function POST(event: APIEvent): Promise<Response> {
  const rawBody = await event.request.text();
  const { whatsappAppSecret } = notificationsConfig();

  const signature = event.request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, whatsappAppSecret)) {
    return new Response("Forbidden", { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const senderPhones = extractSenderPhones(body);
  if (senderPhones.length > 0) {
    // Meta requires 200 quickly; anything else triggers retries. openSession is
    // idempotent, so on a DB failure we log and still ack: Meta's at-least-once
    // redelivery covers the dropped work without a retry storm.
    try {
      const db = getServerRuntime().infra.db;
      const addressRepo = createUserChannelAddressRepo(db);
      const now = Date.now();

      await Promise.all(
        senderPhones.map(async (rawPhone) => {
          const address = normalizePhoneInput(rawPhone);
          if (!address) return;
          const row = await addressRepo.findByChannelAndAddress(
            "whatsapp",
            address,
          );
          // Only open sessions for confirmed ownership; claims start unverified.
          if (!row || row.is_verified !== 1) return;
          await openSession(db, row.user_id, now);
        }),
      );
    } catch (error) {
      logger.error("whatsapp_webhook_session_open_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return new Response("OK", { status: 200 });
}
