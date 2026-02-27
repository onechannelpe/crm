"use server";

import { validationError } from "~/lib/app-errors";
import { isRole, type Role } from "~/lib/auth/access/rbac";
import { requireRole } from "~/lib/auth/access/session";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import { createAppNotificationService } from "~/server/notifications/service";
import { repos } from "~/server/shared/context";

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

function assertAudienceType(value: string): "user" | "role" | "global" {
  if (value === "user" || value === "role" || value === "global") {
    return value;
  }
  throw validationError("Invalid audience type");
}

function assertAudienceRef(
  audienceType: "user" | "role" | "global",
  value: string,
): string | null {
  if (audienceType === "global") {
    return null;
  }

  const ref = assertNonEmptyString(value, "audienceRef");

  if (audienceType === "role") {
    const allowedRoles: Role[] = [
      "executive",
      "supervisor",
      "back_office",
      "sales_manager",
      "logistics",
      "hr",
      "admin",
      "superuser",
    ];
    if (!isRole(ref) || !allowedRoles.includes(ref)) {
      throw validationError("Invalid role audience");
    }
  }

  if (audienceType === "user") {
    const userId = Number(ref);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw validationError("Invalid user audience");
    }
  }

  return ref;
}

export async function sendBroadcastNotification(params: {
  title: string;
  bodyText: string;
  audienceType: string;
  audienceRef: string;
}): Promise<void> {
  const session = await requireRole("admin");
  const audienceType = assertAudienceType(params.audienceType);
  const audienceRef = assertAudienceRef(audienceType, params.audienceRef);

  await notifications.publishCampaign({
    type: "broadcast",
    eventType: "broadcast.general",
    audienceType,
    audienceRef,
    title: assertNonEmptyString(params.title, "title"),
    bodyText: assertNonEmptyString(params.bodyText, "bodyText"),
    createdByUserId: session.userId,
  });

  await notifications.enqueueDueCampaigns(10);
  await notifications.processPendingJobs(100);
}
