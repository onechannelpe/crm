import type { Logger } from "~/lib/observability/logger-shared";
import { toE164Peru } from "~/lib/phone/pe-mobile";

import type { MessagingGateway } from "../channels/messaging-gateway";
import type { DeliveryJob, DeliveryProviderId } from "../repos/delivery-repo";
import { formatWhatsAppNotificationBody } from "./format-message";

// The dispatch queue's settle call writes these as the patch on the same
// lease-guarded statement as the queue_state transition (see dispatch/
// queue.ts). Keeping them out of a separate write is what makes a
// reaped-and-reclaimed lease unable to clobber a newer worker's result.
export interface DeliveryProviderFields {
  provider: DeliveryProviderId | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
}

// retry: transient provider failure. failed: terminal (bad address,
// unsupported template). Mapping retry vs failed to the queue's decision is
// the dispatch queue's job.
export type DeliveryOutcome =
  | { kind: "sent"; fields: DeliveryProviderFields }
  | { kind: "retry"; reason: string; fields: DeliveryProviderFields }
  | { kind: "failed"; reason: string; fields: DeliveryProviderFields };

export function createDeliverySender(deps: {
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">;
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
      deps.logger.info("external_delivered", {
        id: job.intent_id,
        channel: job.channel,
        userId: job.user_id,
      });
      return {
        kind: "sent",
        fields: {
          provider: receipt.value.provider,
          provider_message_id: receipt.value.providerMessageId ?? null,
          error_code: null,
          error_message: null,
        },
      };
    }

    const provider =
      receipt.error.kind === "provider_error" ? receipt.error.provider : null;
    deps.logger.info("external_failed", {
      id: job.intent_id,
      channel: job.channel,
      userId: job.user_id,
      retryable: receipt.error.retryable,
    });

    const fields: DeliveryProviderFields = {
      provider,
      provider_message_id: null,
      error_code: receipt.error.code,
      error_message: receipt.error.message,
    };
    return receipt.error.retryable
      ? { kind: "retry", reason: receipt.error.message, fields }
      : { kind: "failed", reason: receipt.error.message, fields };
  };
}

export type DeliverySender = ReturnType<typeof createDeliverySender>;
