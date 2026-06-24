import { sendWithKapsoWhatsAppText } from "@crm/message-channels";
import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { isPlainRecord } from "~/lib/type-guards";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { openSession } from "~/server/notifications/whatsapp-session";
import { getServerRuntime } from "~/server/platform/container";

const logger = createLogger("whatsapp-webhook");

const VERIFY_COMMAND = "/verificar";
const INBOUND_MESSAGE_EVENT = "whatsapp.message.received";
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

// Parses a Kapso v2 webhook payload (`whatsapp.message.received`) and yields
// one entry per inbound text message with a normalized local-form phone and
// the message body (or null for non-text messages like images/audio).
function extractInboundMessages(body: unknown): InboundMessage[] {
  if (!isPlainRecord(body)) return [];

  // The v2 payload is keyed at the top level: { message, conversation,
  // phone_number_id, is_new_conversation }. Older code paths nested under
  // entry[].changes[].value.messages[]; we only support the Kapso shape.
  const message = isPlainRecord(body["message"]) ? body["message"] : null;
  if (!message) return [];

  // Only react to inbound text messages. Outbound, statuses, and non-text
  // types are ignored here.
  const messageKapso = isPlainRecord(message["kapso"])
    ? message["kapso"]
    : null;
  if (!messageKapso || messageKapso["direction"] !== "inbound") return [];

  const conversation = isPlainRecord(body["conversation"])
    ? body["conversation"]
    : null;
  if (!conversation || typeof conversation["phone_number"] !== "string") {
    return [];
  }

  const text = isPlainRecord(message["text"]) ? message["text"] : undefined;
  const bodyText =
    text && typeof text["body"] === "string" ? text["body"] : null;

  return [{ from: conversation["phone_number"], body: bodyText }];
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

// POST requests reach this handler only after HMAC signature verification
// against KAPSO_WEBHOOK_SECRET (see lib/webhooks/kapso-signature.ts).
export async function POST(event: APIEvent): Promise<Response> {
  // Only react to the inbound-message event. Other events (sent, delivered,
  // read, conversation lifecycle) are not handled here.
  const eventName = event.request.headers.get("x-webhook-event");
  if (eventName !== INBOUND_MESSAGE_EVENT) {
    return new Response("OK", { status: 200 });
  }

  let body: unknown;
  try {
    body = JSON.parse(await event.request.text());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const messages = extractInboundMessages(body);
  logger.info("whatsapp_webhook_received", {
    messageCount: messages.length,
  });
  if (messages.length === 0) return new Response("OK", { status: 200 });

  try {
    const db = getServerRuntime().infra.db;
    const addressRepo = createUserChannelAddressRepo(db);
    const now = Date.now();

    /* eslint-disable no-await-in-loop -- Sequential per-message processing:
       - the verify write must complete before a subsequent message from the
         same sender is read (a duplicate /verificar is a no-op via the
         is_verified filter, but we want that to be observable in tests);
       - the Kapso outbound call is rate-limited per phone number, so we do
         not fan out parallel replies. */
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
    /* eslint-enable no-await-in-loop */
  } catch (error) {
    logger.error("whatsapp_webhook_session_open_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Failed session work remains unacknowledged so the provider can retry it.
    return new Response("Service Unavailable", { status: 503 });
  }

  return new Response("OK", { status: 200 });
}
