import type {
  DeliveryError,
  DeliveryReceipt,
  Result,
} from "@crm/message-channels";

import type { NotificationServiceDeps } from "../domain/types";
import type { NotificationDeliveryJob } from "../repos-campaigns";

export async function processDeliveryJob(
  deps: Pick<NotificationServiceDeps, "messaging">,
  job: NotificationDeliveryJob,
): Promise<Result<DeliveryReceipt, DeliveryError>> {
  if (job.channel === "email") {
    return deps.messaging.sendCampaignEmail({
      to: job.address,
      params: {
        title: job.title ?? undefined,
        bodyText: job.bodyText,
      },
    });
  }

  return deps.messaging.sendWhatsAppText({
    to: job.address,
    body: job.bodyText,
  });
}
