import type { Kysely } from "kysely";

import { toE164Peru } from "~/domain/phone/pe-mobile";
import type { Database } from "~/server/platform/database/types";
import { createJobQueue } from "~/server/platform/jobs/job-queue";
import type { QueueRunner } from "~/server/platform/jobs/types";

import type { MessagingGateway } from "../channels/messaging-gateway";
import { classifySendReceipt } from "../channels/send-result";
import { createOutboundWhatsAppMessageRepo } from "./outbound-message-repo";

const LEASE_MS = 30_000;

export function createOutboundWhatsAppQueue(
  db: Kysely<Database>,
  messaging: Pick<MessagingGateway, "sendWhatsAppText">,
  workerId: string,
  now: () => Date,
): QueueRunner {
  return createJobQueue({
    name: "outbound-whatsapp-messages",
    leaseMs: LEASE_MS,
    maxConcurrency: 8,
    workerId,
    now,
    store: createOutboundWhatsAppMessageRepo(db),
    handle: async (message) => {
      const receipt = await messaging.sendWhatsAppText({
        to: toE164Peru(message.recipient_address),
        body: message.body_text,
      });
      const result = classifySendReceipt(receipt);
      if (result.ok) {
        return {
          kind: "done",
          patch: {
            provider: result.provider,
            provider_message_id: result.providerMessageId,
            error_code: null,
          },
        };
      }

      const patch = {
        provider: result.provider,
        provider_message_id: null,
        error_code: result.code,
      };
      return result.retryable
        ? { kind: "retry", reason: result.message, patch }
        : { kind: "fail", reason: result.message, patch };
    },
  });
}
