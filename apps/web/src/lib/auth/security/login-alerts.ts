import type { NotificationsConfig } from "@crm/notifications";

import { createLogger } from "~/lib/observability/logger";
import type { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import type { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import type { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createAppNotificationService } from "~/server/notifications/service";

import type {
  PrivilegedLoginAlertPayload,
  SendPrivilegedLoginAlert,
} from "./privileged-login-alert";
import { requiresStrongAuthRole } from "./strong-auth-status";

type AlertRepos = {
  notificationCampaigns: ReturnType<typeof createNotificationCampaignsRepo>;
  notificationContacts: ReturnType<typeof createNotificationContactsRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferencesRepo>;
};

const logger = createLogger("login-alerts");

export function createPrivilegedLoginAlertSender(
  repos: AlertRepos,
  config: NotificationsConfig,
): SendPrivilegedLoginAlert {
  const notifications = createAppNotificationService({
    repos: {
      notificationCampaigns: repos.notificationCampaigns,
      notificationContacts: repos.notificationContacts,
      notificationPreferences: repos.notificationPreferences,
    },
    config,
  });

  return async function sendPrivilegedLoginAlert(
    params: PrivilegedLoginAlertPayload,
  ): Promise<void> {
    if (!requiresStrongAuthRole(params.role)) {
      return;
    }

    try {
      await notifications.publishCampaign({
        type: "security_event",
        eventType: "security.privileged_login",
        audienceType: "user",
        audienceRef: String(params.userId),
        title: `Security alert: privileged login (${params.role})`,
        bodyText: [
          "Privileged login detected.",
          `User: ${params.fullName} <${params.email}>`,
          `Role: ${params.role}`,
          `Method: ${params.method}`,
          `IP: ${params.ipAddress}`,
          `Time: ${new Date(params.occurredAt).toISOString()}`,
        ].join("\n"),
        createdByUserId: null,
      });
      await notifications.enqueueDueCampaigns(5);
      await notifications.processPendingJobs(20);
    } catch (error) {
      logger.error("privileged_login_alert_failed", { error });
    }
  };
}
