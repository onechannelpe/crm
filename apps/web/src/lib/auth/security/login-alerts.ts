import { createNotificationService } from "@crm/notifications";

import type { Role } from "~/lib/auth/access/rbac";

import { env } from "~/lib/env";

import { isPrivilegedRole } from "./policy";

const notifications = createNotificationService({
  smtpHost: env.smtpHost || undefined,
  smtpPort: env.smtpPort,
  smtpUser: env.smtpUser || undefined,
  smtpPass: env.smtpPass || undefined,
  smtpFrom: env.smtpFrom || undefined,
});

export async function sendPrivilegedLoginAlert(params: {
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
    await notifications.sendPrivilegedLoginAlert({
      toEmail: params.email,
      userName: params.fullName,
      role: params.role,
      ipAddress: params.ipAddress,
      method: params.method,
      occurredAt: params.occurredAt,
    });
  } catch (error) {
    console.error("Failed to send privileged login alert", error);
  }
}
