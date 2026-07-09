import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { toE164Peru } from "~/lib/phone/pe-mobile";
import { categoriesControllableOn } from "~/server/notifications/categories";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import {
  handleWhatsAppInboundMessage,
  type WhatsAppInboundPorts,
} from "~/server/notifications/whatsapp-inbound/handle-inbound-message";
import { parseKapsoInboundMessage } from "~/server/notifications/whatsapp-inbound/kapso-payload";
import { openSession } from "~/server/notifications/whatsapp-session";
import { getServerRuntime } from "~/server/platform/container";

const logger = createLogger("whatsapp-webhook");
const INBOUND_MESSAGE_EVENT = "whatsapp.message.received";
const VERIFY_REPLY_BODY = [
  "Listo, este número queda verificado para recibir notificaciones de la plataforma.",
  "Te avisaremos por WhatsApp cuando un cliente acepte una tarifa o quede listo para afiliación.",
].join("\n");
const OPT_OUT_REPLY_BODY = [
  "Listo, no recibirás más notificaciones por WhatsApp.",
  "Puedes volver a activarlas cuando quieras desde Configuración > Notificaciones.",
].join("\n");

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

function createInboundPorts(): WhatsAppInboundPorts {
  const runtime = getServerRuntime();
  const db = runtime.infra.db;
  const { messaging, preferences } = runtime.notifications;
  const addresses = createUserChannelAddressRepo(db);

  const sendReply = async (address: string, body: string, event: string) => {
    const result = await messaging.sendWhatsAppText({
      to: toE164Peru(address),
      body,
    });
    if (!result.ok) {
      logger.warn(event, {
        code: result.error.code,
        message: result.error.message,
      });
    }
  };

  return {
    addresses: {
      async findClaim(address) {
        const row = await addresses.findByChannelAndAddress(
          "whatsapp",
          address,
        );
        return row
          ? {
              userId: row.user_id,
              address: row.address,
              verified: row.is_verified,
            }
          : undefined;
      },
      markVerified: addresses.markWhatsAppVerified,
    },
    sessions: {
      async open(userId, now) {
        await openSession(db, userId, now);
      },
    },
    preferences: {
      async muteWhatsApp(userId, now) {
        await preferences.muteChannel({
          userId,
          channel: "whatsapp",
          categories: categoriesControllableOn("whatsapp"),
          now,
        });
      },
    },
    replies: {
      sendVerificationReply: (address) =>
        sendReply(address, VERIFY_REPLY_BODY, "verify_reply_failed"),
      sendOptOutReply: (address) =>
        sendReply(address, OPT_OUT_REPLY_BODY, "opt_out_reply_failed"),
    },
    logger,
  };
}

export async function POST(event: APIEvent): Promise<Response> {
  if (event.request.headers.get("x-webhook-event") !== INBOUND_MESSAGE_EVENT) {
    return new Response("OK", { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await event.request.text());
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const message = parseKapsoInboundMessage(payload);
  logger.info("whatsapp_webhook_received", {
    messageCount: message ? 1 : 0,
  });
  if (!message) return new Response("OK", { status: 200 });

  try {
    await handleWhatsAppInboundMessage(
      message,
      new Date(),
      createInboundPorts(),
    );
  } catch (error) {
    logger.error("whatsapp_webhook_processing_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Service Unavailable", { status: 503 });
  }

  return new Response("OK", { status: 200 });
}
