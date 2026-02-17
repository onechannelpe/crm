import type { NotificationsConfig } from "@crm/notifications";

import { createAppNotificationService } from "~/server/notifications/service";
import type { Repositories } from "~/server/shared/registry";

import { isPrivilegedRole } from "./policy";
import type {
  PrivilegedLoginAlertPayload,
  SendPrivilegedLoginAlert,
} from "./privileged-login-alert";

type AlertRepos = Pick<
  Repositories,
  "notificationCampaigns" | "notificationContacts" | "notificationPreferences"
>;

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
    if (!isPrivilegedRole(params.role)) {
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
      console.error("Failed to send privileged login alert", error);
    }
  };
}
