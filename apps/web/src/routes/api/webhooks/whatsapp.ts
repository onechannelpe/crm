import type { APIEvent } from "@solidjs/start/server";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { receiveKapsoWebhook } from "~/server/integrations/kapso/webhooks/receive-webhook";
import { getServerRuntime } from "~/server/platform/container";

const logger = createLogger("whatsapp-webhook");
const INBOUND_MESSAGE_EVENT = "whatsapp.message.received";

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

export async function POST(event: APIEvent): Promise<Response> {
  const eventType = event.request.headers.get("x-webhook-event");
  if (eventType !== INBOUND_MESSAGE_EVENT) {
    return new Response("OK", { status: 200 });
  }

  try {
    const { infra } = getServerRuntime();
    const result = await receiveKapsoWebhook(infra.db, {
      idempotencyKey: event.request.headers.get("x-idempotency-key"),
      eventType,
      payloadVersion: event.request.headers.get("x-webhook-payload-version"),
      rawBody: await event.request.text(),
      now: infra.now(),
    });
    if (!result.ok) {
      logger.warn("whatsapp_webhook_rejected", { reason: result.error });
      return new Response("Bad Request", { status: 400 });
    }

    logger.info("whatsapp_webhook_received", { receipt: result.value });
    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error("whatsapp_webhook_receipt_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Service Unavailable", { status: 503 });
  }
}
