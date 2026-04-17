import { createLogger } from "~/lib/observability/logger";
import type { NotificationService } from "~/server/notifications/service";

import type {
  PrivilegedLoginAlertPayload,
  SendPrivilegedLoginAlert,
} from "./privileged-login-alert";
import { requiresStrongAuthRole } from "./strong-auth-status";

interface AlertNotifications {
  service: Pick<NotificationService, "publishCampaign" | "enqueueDueCampaigns">;
  dispatchPendingJobs(): Promise<void>;
}

const logger = createLogger("login-alerts");

export function createPrivilegedLoginAlertSender(
  notifications: AlertNotifications,
): SendPrivilegedLoginAlert {
  return async function sendPrivilegedLoginAlert(
    params: PrivilegedLoginAlertPayload,
  ): Promise<void> {
    if (!requiresStrongAuthRole(params.role)) {
      return;
    }

    try {
      await notifications.service.publishCampaign({
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
      await notifications.service.enqueueDueCampaigns(5);
      await notifications.dispatchPendingJobs();
    } catch (error) {
      logger.error("privileged_login_alert_failed", { error });
    }
  };
}
