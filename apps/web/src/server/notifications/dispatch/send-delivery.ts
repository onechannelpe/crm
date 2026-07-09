import type { Logger } from "~/lib/observability/logger-shared";
import { toE164Peru } from "~/lib/phone/pe-mobile";

import type { MessagingGateway } from "../channels/messaging-gateway";
import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import { formatWhatsAppNotificationBody } from "./format-message";

// retry: transient provider failure. failed: terminal (bad address,
// unsupported template). Mapping retry vs failed to the queue's decision is
// the dispatch queue's job.
export type DeliveryOutcome =
  | { kind: "sent" }
  | { kind: "retry"; reason: string }
  | { kind: "failed"; reason: string };

export function createDeliverySender(deps: {
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">;
  deliveries: Pick<DeliveryRepository, "recordAttempt">;
  publicOrigin: string;
  logger: Pick<Logger, "info">;
}) {
  return async function sendDelivery(
    job: DeliveryJob,
  ): Promise<DeliveryOutcome> {
    const receipt =
      job.channel === "email"
        ? await deps.messaging.sendCampaignEmail({
            to: job.recipient_address,
            params: {
              title: job.title,
              bodyText: job.body_text,
              platformName: "Culqi360",
            },
          })
        : await deps.messaging.sendWhatsAppText({
            to: toE164Peru(job.recipient_address),
            body: formatWhatsAppNotificationBody(job, deps.publicOrigin),
          });

    if (receipt.ok) {
      await deps.deliveries.recordAttempt(job.id, {
        provider: receipt.value.provider,
        provider_message_id: receipt.value.providerMessageId ?? null,
        error_code: null,
        error_message: null,
        latency_ms: null,
      });
      deps.logger.info("external_delivered", {
        id: job.intent_id,
        channel: job.channel,
        userId: job.user_id,
      });
      return { kind: "sent" };
    }

    const provider =
      receipt.error.kind === "provider_error" ? receipt.error.provider : null;
    await deps.deliveries.recordAttempt(job.id, {
      provider,
      provider_message_id: null,
      error_code: receipt.error.code,
      error_message: receipt.error.message,
      latency_ms: null,
    });
    deps.logger.info("external_failed", {
      id: job.intent_id,
      channel: job.channel,
      userId: job.user_id,
      retryable: receipt.error.retryable,
    });

    return receipt.error.retryable
      ? { kind: "retry", reason: receipt.error.message }
      : { kind: "failed", reason: receipt.error.message };
  };
}

export type DeliverySender = ReturnType<typeof createDeliverySender>;
