import { createLogger } from "~/lib/observability/logger";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import type { NotificationIntent } from "~/server/notifications/types";

import type {
  PrivilegedLoginAlertPayload,
  SendPrivilegedLoginAlert,
} from "./privileged-login-alert";

interface AlertNotifications {
  enqueue(intents: NotificationIntent[], now: number): Promise<void>;
  dispatchPendingJobs(): void;
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
      await notifications.enqueue(
        [
          {
            id: `security:login:${params.userId}:${params.occurredAt}`,
            eventType: "security.privileged_login",
            audience: { kind: "user_ids", userIds: [params.userId] },
            channels: ["in_app", "email", "whatsapp"],
            priority: "high",
            title: `Security alert: privileged login (${params.role})`,
            bodyText: [
              "Privileged login detected.",
              `User: ${params.fullName} <${params.email}>`,
              `Role: ${params.role}`,
              `Method: ${params.method}`,
              `IP: ${params.ipAddress}`,
              `Time: ${new Date(params.occurredAt).toISOString()}`,
            ].join("\n"),
            actionUrl: null,
          },
        ],
        params.occurredAt,
      );
      notifications.dispatchPendingJobs();
    } catch (error) {
      logger.error("privileged_login_alert_failed", { error });
    }
  };
}
