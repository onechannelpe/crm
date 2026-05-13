"use server";

import { randomUUIDv7 } from "bun";

import { validationError } from "~/lib/app-errors";
import { isRole } from "~/lib/auth/access/rbac";
import { requireRole } from "~/lib/auth/access/session";
import { assertNonEmptyString } from "~/contracts/guards";
import type { NotificationAudience } from "~/server/notifications/types";
import { getServerRuntime } from "~/server/runtime";

function assertAudienceType(
  value: string,
): "user_ids" | "global_roles" | "team" {
  if (value === "user_ids" || value === "global_roles" || value === "team") {
    return value;
  }
  throw validationError("Invalid audience type");
}

function parseAudience(
  audienceType: "user_ids" | "global_roles" | "team",
  value: string,
): NotificationAudience {
  const ref = assertNonEmptyString(value, "audienceRef");
  if (audienceType === "user_ids") {
    const userId = Number(ref);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw validationError("Invalid user audience");
    }
    return { kind: "user_ids", userIds: [userId] };
  }
  if (audienceType === "team") {
    const teamId = Number(ref);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw validationError("Invalid team audience");
    }
    return { kind: "team_id", teamId };
  }
  if (!isRole(ref)) {
    throw validationError("Invalid global role audience");
  }
  return { kind: "global_role", role: ref };
}

export async function sendBroadcastNotification(params: {
  title: string;
  bodyText: string;
  audienceType: string;
  audienceRef: string;
}): Promise<void> {
  const session = await requireRole("admin");
  const audienceType = assertAudienceType(params.audienceType);
  const audience = parseAudience(audienceType, params.audienceRef);
  const now = Date.now();

  await getServerRuntime().notifications.enqueue(
    [
      {
        id: `broadcast:${session.userId}:${randomUUIDv7()}`,
        eventType: "broadcast.general",
        audience,
        channels: ["in_app", "email", "whatsapp"],
        priority: "normal",
        title: assertNonEmptyString(params.title, "title"),
        bodyText: assertNonEmptyString(params.bodyText, "bodyText"),
        actionUrl: null,
      },
    ],
    now,
  );
  await getServerRuntime().notifications.dispatchPendingJobs();
}
