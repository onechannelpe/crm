import { randomUUIDv7 } from "bun";

import { isRole } from "~/domain/auth/access/rbac";
import { invalid, type DomainError } from "~/domain/errors";
import { NotificationIntentId, TeamId, UserId } from "~/domain/ids";
import { getApplication } from "~/server/composition/application";
import type { NotificationAudience } from "~/server/notifications/types";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Err, isErr, Ok, type Result } from "~/shared/result";

const AUDIENCE_TYPES = ["user_ids", "global_roles", "team"] as const;

function resolveAudience(
  audienceType: (typeof AUDIENCE_TYPES)[number],
  ref: string,
): Result<NotificationAudience, DomainError> {
  const value = ref.trim();

  if (audienceType === "user_ids") {
    const userId = UserId.parse(value);
    if (isErr(userId)) {
      return Err(invalid({ code: "invalid_user_audience" }));
    }

    return Ok({ kind: "user_ids", userIds: [userId.value] });
  }

  if (audienceType === "team") {
    const teamId = TeamId.parse(value);
    if (isErr(teamId)) {
      return Err(invalid({ code: "invalid_team_audience" }));
    }

    return Ok({ kind: "team_id", teamId: teamId.value });
  }

  if (!isRole(value)) {
    return Err(invalid({ code: "invalid_role_audience" }));
  }

  return Ok({ kind: "global_role", role: value });
}

export async function sendBroadcastNotification(
  params: unknown,
): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "notifications.broadcast",
    access: { kind: "role", role: "admin" },

    parse: () => {
      const parsed = parseObject(params, validationFail, (r) => ({
        title: r.str("title"),
        bodyText: r.str("bodyText"),
        audienceType: r.enum("audienceType", AUDIENCE_TYPES),
        audienceRef: r.str("audienceRef"),
      }));
      if (isErr(parsed)) return parsed;

      const { title, bodyText, audienceType, audienceRef } = parsed.value;
      const audience = resolveAudience(audienceType, audienceRef);
      if (isErr(audience)) return audience;

      return Ok({
        title,
        bodyText,
        audience: audience.value,
      });
    },

    telemetry: ({ audience }) => ({ audienceKind: audience.kind }),

    execute: async (ctx, input) => {
      await getApplication().notifications.enqueue(
        [
          {
            id: NotificationIntentId.trust(
              `broadcast:${ctx.actor.userId}:${randomUUIDv7()}`,
            ),
            eventType: "broadcast.general",
            audience: input.audience,
            channels: ["in_app", "email", "whatsapp"],
            priority: "normal",
            title: input.title,
            bodyText: input.bodyText,
            actionUrl: null,
          },
        ],
        ctx,
      );

      return Ok(undefined);
    },
  });
}
