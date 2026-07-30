import type { ApiRequestEvent } from "~/routes/api/request-event";
import { receiveKapsoWebhook } from "~/server/integrations/kapso/webhooks/receive-webhook";
import { serverInfrastructure } from "~/server/platform/composition/infrastructure";
import { notificationsConfig } from "~/server/platform/config/env";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("whatsapp-webhook");

export function GET(event: ApiRequestEvent): Response {
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

export async function POST(event: ApiRequestEvent): Promise<Response> {
  try {
    const result = await receiveKapsoWebhook(serverInfrastructure.db, {
      idempotencyKey: event.request.headers.get("x-idempotency-key"),
      eventType: event.request.headers.get("x-webhook-event"),
      payloadVersion: event.request.headers.get("x-webhook-payload-version"),
      rawBody: await event.request.text(),
      now: serverInfrastructure.now(),
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
