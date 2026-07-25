import type { DeliveryProviderId } from "@crm/message-channels";

import { toE164Peru } from "~/domain/phone/pe-mobile";
import type { Logger } from "~/shared/observability/logger";

import type { MessagingGateway } from "../channels/messaging-gateway";
import { classifySendReceipt } from "../channels/send-result";
import type { DeliveryJob } from "../repos/delivery-repo";
import { formatWhatsAppNotificationBody } from "./format-message";

// The queue writes these fields with queue_state in one lease-guarded update.
// A worker with an expired lease cannot overwrite a newer worker's result.
export interface DeliveryProviderFields {
  provider: DeliveryProviderId | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
}

// Retry means the provider may succeed later. Failed means the address or message
// cannot succeed. The queue converts these outcomes into its state values.
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

    const result = classifySendReceipt(receipt);
    if (result.ok) {
      deps.logger.info("external_delivered", {
        id: job.intent_id,
        channel: job.channel,
        userId: job.user_id,
      });
      return {
        kind: "sent",
        fields: {
          provider: result.provider,
          provider_message_id: result.providerMessageId,
          error_code: null,
          error_message: null,
        },
      };
    }

    deps.logger.info("external_failed", {
      id: job.intent_id,
      channel: job.channel,
      userId: job.user_id,
      retryable: result.retryable,
    });

    const fields: DeliveryProviderFields = {
      provider: result.provider,
      provider_message_id: null,
      error_code: result.code,
      error_message: result.message,
    };
    return result.retryable
      ? { kind: "retry", reason: result.message, fields }
      : { kind: "failed", reason: result.message, fields };
  };
}

export type DeliverySender = ReturnType<typeof createDeliverySender>;
