import { createLogger } from "~/lib/observability/logger";
import type { NotificationCampaignService } from "~/server/notifications/service";

import type {
  PrivilegedLoginAlertPayload,
  SendPrivilegedLoginAlert,
} from "./privileged-login-alert";
import { requiresStrongAuthRole } from "./strong-auth-status";

interface AlertNotifications {
  service: NotificationCampaignService;
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
        eventType: "security.privileged_login",
        audienceKind: "user_ids",
        audience: { user_ids: [params.userId] },
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
      await notifications.dispatchPendingJobs();
    } catch (error) {
      logger.error("privileged_login_alert_failed", { error });
    }
  };
}
