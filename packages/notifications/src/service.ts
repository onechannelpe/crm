import { sendWithResend } from "./channels/email/resend-client";
import { sendWithWhatsAppCloudText } from "./channels/whatsapp/meta-cloud";
import type {
  NotificationSendInput,
  NotificationService,
  NotificationsConfig,
} from "./types";

function isEmailConfigured(config: NotificationsConfig): boolean {
  return Boolean(config.resendApiKey && config.fromEmail);
}

function isWhatsAppConfigured(config: NotificationsConfig): boolean {
  return Boolean(
    config.whatsappAccessToken &&
      config.whatsappPhoneNumberId &&
      config.whatsappApiVersion,
  );
}

export function createNotificationService(
  config: NotificationsConfig,
): NotificationService {
  return {
    async send(input: NotificationSendInput): Promise<void> {
      if (input.channel === "email") {
        if (!isEmailConfigured(config)) {
          throw new Error("Email notifications are not configured");
        }

        if (!input.subject?.trim()) {
          throw new Error("Email subject is required");
        }

        await sendWithResend(config.resendApiKey!, {
          from: config.fromEmail!,
          to: input.to,
          subject: input.subject,
          html: input.html ?? `<pre>${input.text}</pre>`,
          text: input.text,
        });
        return;
      }

      if (input.channel !== "whatsapp") {
        throw new Error("Unsupported notification channel");
      }

      if (!isWhatsAppConfigured(config)) {
        throw new Error("WhatsApp notifications are not configured");
      }

      await sendWithWhatsAppCloudText({
        accessToken: config.whatsappAccessToken!,
        phoneNumberId: config.whatsappPhoneNumberId!,
        apiVersion: config.whatsappApiVersion!,
        to: input.to,
        body: input.text,
      });
    },
  };
}
