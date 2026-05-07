"use server";

import { validationError } from "~/lib/app-errors";
import { isRole, type Role } from "~/lib/auth/access/rbac";
import { requireRole } from "~/lib/auth/access/session";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { getServerRuntime } from "~/server/runtime";

function assertAudienceType(
  value: string,
): "user_ids" | "global_roles" | "team" {
  if (value === "user_ids" || value === "global_roles" || value === "team") {
    return value;
  }
  throw validationError("Invalid audience type");
}

function assertAudienceRef(
  audienceType: "user_ids" | "global_roles" | "team",
  value: string,
): Record<string, unknown> {
  const ref = assertNonEmptyString(value, "audienceRef");
  if (audienceType === "user_ids") {
    const userId = Number(ref);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw validationError("Invalid user audience");
    }
    return { user_ids: [userId] };
  }
  if (audienceType === "team") {
    const teamId = Number(ref);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw validationError("Invalid team audience");
    }
    return { team_id: teamId };
  }
  if (!isRole(ref)) {
    throw validationError("Invalid global role audience");
  }
  return { global_roles: [ref as Role] };
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

  await getServerRuntime().notifications.service.publishCampaign({
    eventType: "broadcast.general",
    audienceKind: audienceType,
    audience: audienceRef,
    title: assertNonEmptyString(params.title, "title"),
    bodyText: assertNonEmptyString(params.bodyText, "bodyText"),
    createdByUserId: session.userId,
  });
  await getServerRuntime().notifications.dispatchPendingJobs();
}
