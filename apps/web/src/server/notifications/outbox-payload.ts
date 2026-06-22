import { isRole } from "~/lib/auth/access/rbac";
import { isPlainRecord } from "~/lib/type-guards";

import type { NotificationAudience, NotificationChannel } from "./types";

const NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "whatsapp",
] as const satisfies ReadonlyArray<NotificationChannel>;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNotificationAudience(value: unknown): value is NotificationAudience {
  if (!isPlainRecord(value) || typeof value["kind"] !== "string") return false;

  switch (value["kind"]) {
    case "user_ids":
      return (
        Array.isArray(value["userIds"]) &&
        value["userIds"].every(isPositiveInteger)
      );
    case "branch_role":
      return (
        isPositiveInteger(value["branchId"]) &&
        typeof value["role"] === "string" &&
        isRole(value["role"])
      );
    case "global_role":
      return typeof value["role"] === "string" && isRole(value["role"]);
    case "team_id":
      return isPositiveInteger(value["teamId"]);
    default:
      return false;
  }
}

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return NOTIFICATION_CHANNELS.some((channel) => channel === value);
}

export function parseNotificationAudience(value: string): NotificationAudience {
  const parsed: unknown = JSON.parse(value);
  if (!isNotificationAudience(parsed)) {
    throw new Error("Invalid notification audience payload");
  }
  return parsed;
}

export function parseNotificationChannels(
  value: string,
): NotificationChannel[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every(isNotificationChannel)) {
    throw new Error("Invalid notification channels payload");
  }
  return parsed;
}
