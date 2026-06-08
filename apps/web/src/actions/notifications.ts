"use server";

import { randomUUIDv7 } from "bun";

import { isRole } from "~/lib/auth/access/rbac";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { NotificationAudience } from "~/server/notifications/types";

const AUDIENCE_TYPES = ["user_ids", "global_roles", "team"] as const;

type BroadcastInput = {
  title: string;
  bodyText: string;
  audience: NotificationAudience;
};

function resolveAudience(
  audienceType: (typeof AUDIENCE_TYPES)[number],
  ref: string,
): Result<NotificationAudience, DomainError> {
  if (audienceType === "user_ids") {
    const userId = Number(ref);
    if (!Number.isInteger(userId) || userId <= 0) {
      return Err(
        domainError("validation", "invalid_user_audience", "Invalid audience"),
      );
    }
    return Ok({ kind: "user_ids", userIds: [userId] });
  }
  if (audienceType === "team") {
    const teamId = Number(ref);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Err(
        domainError("validation", "invalid_team_audience", "Invalid audience"),
      );
    }
    return Ok({ kind: "team_id", teamId });
  }
  if (!isRole(ref)) {
    return Err(
      domainError("validation", "invalid_role_audience", "Invalid audience"),
    );
  }
  return Ok({ kind: "global_role", role: ref });
}

function parseBroadcast(params: unknown): Result<BroadcastInput, DomainError> {
  const shape = parseObject(params, validationFail, (r) => ({
    title: r.str("title"),
    bodyText: r.str("bodyText"),
    audienceType: r.enum("audienceType", AUDIENCE_TYPES),
    audienceRef: r.str("audienceRef"),
  }));
  if (isErr(shape)) return shape;

  const audience = resolveAudience(shape.value.audienceType, shape.value.audienceRef);
  if (isErr(audience)) return audience;

  return Ok({
    title: shape.value.title,
    bodyText: shape.value.bodyText,
    audience: audience.value,
  });
}

export async function sendBroadcastNotification(params: unknown): Promise<void> {
  await runAction({
    actionName: "notifications.broadcast",
    access: { kind: "role", role: "admin" },
    parse: () => parseBroadcast(params),
    audit: ({ audience }) => ({ audienceKind: audience.kind }),
    execute: async (ctx, input) => {
      const now = Date.now();
      await getServerRuntime().notifications.enqueue(
        [
          {
            id: `broadcast:${ctx.actor.userId}:${randomUUIDv7()}`,
            eventType: "broadcast.general",
            audience: input.audience,
            channels: ["in_app", "email", "whatsapp"],
            priority: "normal",
            title: input.title,
            bodyText: input.bodyText,
            actionUrl: null,
          },
        ],
        now,
      );
      await getServerRuntime().notifications.dispatchPendingJobs();
      return Ok(undefined);
    },
  });
}
