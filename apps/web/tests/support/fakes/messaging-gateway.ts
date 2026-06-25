import type {
  DeliveryReceipt,
  Result,
  DeliveryError,
} from "@crm/message-channels";

import type { MessagingGateway } from "~/server/notifications/messaging-gateway";

type SendResult = Result<DeliveryReceipt, DeliveryError>;

const EMAIL_RESULT: SendResult = {
  ok: true,
  value: {
    channel: "email",
    provider: "resend",
    providerMessageId: "test-email",
  },
};

const WHATSAPP_RESULT: SendResult = {
  ok: true,
  value: {
    channel: "whatsapp",
    provider: "whatsapp_cloud",
    providerMessageId: "test-whatsapp",
  },
};

export function createRecordingMessagingGateway() {
  const campaignEmails: Array<{
    to: string;
    params: Parameters<MessagingGateway["sendCampaignEmail"]>[0]["params"];
  }> = [];
  const whatsAppMessages: Array<{ to: string; body: string }> = [];

  const gateway: Pick<
    MessagingGateway,
    "sendCampaignEmail" | "sendWhatsAppText"
  > = {
    async sendCampaignEmail(input) {
      campaignEmails.push(input);
      return EMAIL_RESULT;
    },
    async sendWhatsAppText(input) {
      whatsAppMessages.push(input);
      return WHATSAPP_RESULT;
    },
  };

  return { gateway, campaignEmails, whatsAppMessages };
}
