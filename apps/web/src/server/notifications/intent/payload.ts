import { isRole } from "~/domain/auth/access/rbac";
import { NotificationIntentId } from "~/domain/ids";
import { isErr } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

import type {
  NotificationAudience,
  NotificationChannel,
  NotificationIntent,
} from "../types";

const NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "whatsapp",
] as const satisfies ReadonlyArray<NotificationChannel>;

const NOTIFICATION_PRIORITIES = [
  "high",
  "normal",
  "low",
] as const satisfies ReadonlyArray<NotificationIntent["priority"]>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNotificationAudience(value: unknown): value is NotificationAudience {
  if (!isPlainRecord(value) || typeof value["kind"] !== "string") {
    return false;
  }

  switch (value["kind"]) {
    case "user_ids":
      return (
        Array.isArray(value["userIds"]) &&
        value["userIds"].every(isNonEmptyString)
      );
    case "branch_role":
      return (
        isNonEmptyString(value["branchId"]) &&
        typeof value["role"] === "string" &&
        isRole(value["role"])
      );
    case "global_role":
      return typeof value["role"] === "string" && isRole(value["role"]);
    case "team_id":
      return isNonEmptyString(value["teamId"]);
    default:
      return false;
  }
}

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as ReadonlyArray<unknown>).includes(value);
}

function isNotificationChannels(
  value: unknown,
): value is NotificationChannel[] {
  return Array.isArray(value) && value.every(isNotificationChannel);
}

function isNotificationPriority(
  value: unknown,
): value is NotificationIntent["priority"] {
  return (NOTIFICATION_PRIORITIES as ReadonlyArray<unknown>).includes(value);
}

function isNotificationIntent(value: unknown): value is NotificationIntent {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value["id"] === "string" &&
    !isErr(NotificationIntentId.parse(value["id"])) &&
    typeof value["eventType"] === "string" &&
    isNotificationAudience(value["audience"]) &&
    isNotificationChannels(value["channels"]) &&
    isNotificationPriority(value["priority"]) &&
    typeof value["title"] === "string" &&
    typeof value["bodyText"] === "string" &&
    (value["actionUrl"] === null || typeof value["actionUrl"] === "string")
  );
}

// Producer boundary: bad input is rejected before the row reaches the
// durable outbox table, where retries would multiply the cost.
export function validateNotificationIntent(input: unknown): NotificationIntent {
  if (!isNotificationIntent(input)) {
    throw new Error("Invalid notification intent");
  }
  return input;
}

export function parseNotificationAudience(
  value: unknown,
): NotificationAudience {
  if (!isNotificationAudience(value)) {
    throw new Error("Invalid notification audience payload");
  }
  return value;
}

export function parseNotificationChannels(
  value: unknown,
): NotificationChannel[] {
  if (!isNotificationChannels(value)) {
    throw new Error("Invalid notification channels payload");
  }
  return value;
}
