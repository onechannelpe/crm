import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { isPlainRecord } from "~/lib/type-guards";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { openSession } from "~/server/notifications/whatsapp-session";
import { getServerRuntime } from "~/server/platform/container";

const logger = createLogger("whatsapp-webhook");

// Meta's subscription handshake: echo hub.challenge when the verify token
// matches. There is no body to sign here, so the token is the shared secret.
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
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
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

// Machine request policy verifies the signature before route dispatch.
export async function POST(event: APIEvent): Promise<Response> {
  let body: unknown;
  try {
    body = JSON.parse(await event.request.text());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const senderPhones = extractSenderPhones(body);
  if (senderPhones.length === 0) return new Response("OK", { status: 200 });

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
        // Only confirmed ownership can open a messaging session.
        if (!row || row.is_verified !== 1) return;
        await openSession(db, row.user_id, now);
      }),
    );
  } catch (error) {
    logger.error("whatsapp_webhook_session_open_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Failed session work remains unacknowledged so the provider can retry it.
    return new Response("Service Unavailable", { status: 503 });
  }

  return new Response("OK", { status: 200 });
}
