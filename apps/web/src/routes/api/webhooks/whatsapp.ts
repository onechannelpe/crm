import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { isPlainRecord } from "~/lib/type-guards";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { openSession } from "~/server/notifications/whatsapp-session";
import { getServerRuntime } from "~/server/platform/container";
import { sendWithKapsoWhatsAppText } from "@crm/message-channels";

const logger = createLogger("whatsapp-webhook");

const VERIFY_COMMAND = "/verificar";
const VERIFY_REPLY_BODY = [
  "Listo, este número queda verificado para recibir notificaciones de la plataforma.",
  "Te avisaremos por WhatsApp cuando un cliente acepte una tarifa o quede listo para afiliación.",
].join("\n");

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

type InboundMessage = { from: string; body: string | null };

function extractInboundMessages(body: unknown): InboundMessage[] {
  if (!isPlainRecord(body) || body["object"] !== "whatsapp_business_account") {
    return [];
  }

  const messages: InboundMessage[] = [];
  const entries = Array.isArray(body["entry"]) ? body["entry"] : [];

  for (const entry of entries) {
    if (!isPlainRecord(entry)) continue;
    const changes = Array.isArray(entry["changes"]) ? entry["changes"] : [];
    for (const change of changes) {
      if (!isPlainRecord(change) || change["field"] !== "messages") continue;
      const value = isPlainRecord(change["value"]) ? change["value"] : {};
      const inbound = Array.isArray(value["messages"])
        ? value["messages"]
        : [];
      for (const msg of inbound) {
        if (!isPlainRecord(msg) || typeof msg["from"] !== "string") continue;
        const text = isPlainRecord(msg["text"])
          ? msg["text"]
          : undefined;
        const bodyText =
          text && typeof text["body"] === "string" ? text["body"] : null;
        messages.push({ from: msg["from"], body: bodyText });
      }
    }
  }

  return messages;
}

function isVerifyCommand(body: string | null): boolean {
  if (body === null) return false;
  return body.trim().toLowerCase() === VERIFY_COMMAND;
}

async function sendVerificationReply(rawPhone: string): Promise<void> {
  const { kapso } = notificationsConfig();
  if (!kapso) {
    logger.warn("verify_reply_skipped_no_kapso_config");
    return;
  }
  try {
    await sendWithKapsoWhatsAppText({
      apiKey: kapso.apiKey,
      phoneNumberId: kapso.whatsappPhoneNumberId,
      metaGraphVersion: kapso.metaGraphVersion,
      to: rawPhone,
      body: VERIFY_REPLY_BODY,
    });
  } catch (error) {
    // Reply failure must not block the rest of the webhook work. Log and
    // continue: the user is verified either way.
    logger.error("verify_reply_failed", {
      to: rawPhone,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST requests reach this handler only after HMAC signature verification.
export async function POST(event: APIEvent): Promise<Response> {
  let body: unknown;
  try {
    body = JSON.parse(await event.request.text());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const messages = extractInboundMessages(body);
  if (messages.length === 0) return new Response("OK", { status: 200 });

  try {
    const db = getServerRuntime().infra.db;
    const addressRepo = createUserChannelAddressRepo(db);
    const now = Date.now();

    for (const message of messages) {
      const localAddress = normalizePhoneInput(message.from);
      if (!localAddress) continue;
      const row = await addressRepo.findByChannelAndAddress(
        "whatsapp",
        localAddress,
      );
      if (!row) {
        // No claim for this number: leave it alone. Replying to unclaimed
        // senders is exactly the unsolicited-message pattern Meta penalizes.
        logger.info("whatsapp_webhook_unknown_sender", {
          from: message.from,
          command: isVerifyCommand(message.body),
        });
        continue;
      }

      const verifyCommand = isVerifyCommand(message.body);

      if (row.is_verified !== 1 && verifyCommand) {
        // Ownership signal: the user can receive a WA from this number, and
        // they typed /verificar. Mark the address verified and reply.
        await addressRepo.markWhatsAppVerified({
          userId: row.user_id,
          address: row.address,
          now,
        });
        await openSession(db, row.user_id, now);
        await sendVerificationReply(message.from);
        logger.info("whatsapp_webhook_verified", {
          userId: row.user_id,
          from: message.from,
        });
        continue;
      }

      // Already verified, or a non-command message: just keep the session
      // alive so the executive can keep receiving workflow notifications.
      if (row.is_verified === 1) {
        await openSession(db, row.user_id, now);
      }
    }
  } catch (error) {
    logger.error("whatsapp_webhook_session_open_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Failed session work remains unacknowledged so the provider can retry it.
    return new Response("Service Unavailable", { status: 503 });
  }

  return new Response("OK", { status: 200 });
}
