import { createNotificationService } from "@crm/notifications";

import { env } from "~/lib/env";

export function createNotificationsRuntime() {
  return {
    notificationSender: createNotificationService({
      resendApiKey: env.resendApiKey || undefined,
      fromEmail: env.emailFrom || undefined,
      whatsappAccessToken: env.whatsappAccessToken || undefined,
      whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
      whatsappApiVersion: env.whatsappApiVersion || undefined,
    }),
  };
}
