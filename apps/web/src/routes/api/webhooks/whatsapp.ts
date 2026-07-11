import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import type { ApiRequestEvent } from "~/routes/api/request-event";
import { receiveKapsoWebhook } from "~/server/integrations/kapso/webhooks/receive-webhook";
import { getServerRuntime } from "~/server/platform/container";

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
    const { infra } = getServerRuntime();
    const result = await receiveKapsoWebhook(infra.db, {
      idempotencyKey: event.request.headers.get("x-idempotency-key"),
      eventType: event.request.headers.get("x-webhook-event"),
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
