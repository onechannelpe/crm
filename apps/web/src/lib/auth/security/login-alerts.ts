import type { Role } from "~/lib/auth/access/rbac";
import { env } from "~/lib/env";
import { createAppNotificationService } from "~/server/notifications/service";
import { repos } from "~/server/shared/context";

import { isPrivilegedRole } from "./policy";

const notifications = createAppNotificationService({
  repos: {
    notificationCampaigns: repos.notificationCampaigns,
    notificationContacts: repos.notificationContacts,
    notificationPreferences: repos.notificationPreferences,
  },
  config: {
    resendApiKey: env.resendApiKey || undefined,
    fromEmail: env.emailFrom || undefined,
    whatsappAccessToken: env.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: env.whatsappApiVersion || undefined,
  },
});

export async function sendPrivilegedLoginAlert(params: {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
  ipAddress: string;
  method: string;
  occurredAt: number;
}): Promise<void> {
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
}
