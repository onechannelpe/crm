import { randomUUIDv7 } from "bun";

import { isRole } from "~/domain/auth/access/rbac";
import { invalid, type DomainError } from "~/domain/errors";
import { NotificationIntentId, TeamId, UserId } from "~/domain/ids";
import type { NotificationAudience } from "~/server/notifications/types";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { Err, isErr, Ok, type Result } from "~/shared/result";

const AUDIENCE_TYPES = ["user_ids", "global_roles", "team"] as const;

function resolveAudience(
  audienceType: (typeof AUDIENCE_TYPES)[number],
  ref: string,
): Result<NotificationAudience, DomainError> {
  if (audienceType === "user_ids") {
    const parsed = UserId.parse(ref.trim());
    if (isErr(parsed)) {
      return Err(invalid({ code: "invalid_user_audience" }));
    }

    return Ok({ kind: "user_ids", userIds: [parsed.value] });
  }

  if (audienceType === "team") {
    const parsed = TeamId.parse(ref.trim());
    if (isErr(parsed)) {
      return Err(invalid({ code: "invalid_team_audience" }));
    }

    return Ok({ kind: "team_id", teamId: parsed.value });
  }

  if (!isRole(ref)) {
    return Err(invalid({ code: "invalid_role_audience" }));
  }

  return Ok({ kind: "global_role", role: ref });
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

      if (isErr(parsed)) {
        return parsed;
      }

      const audience = resolveAudience(
        parsed.value.audienceType,
        parsed.value.audienceRef,
      );

      if (isErr(audience)) {
        return audience;
      }

      return Ok({
        title: parsed.value.title,
        bodyText: parsed.value.bodyText,
        audience: audience.value,
      });
    },

    audit: ({ audience }) => ({ audienceKind: audience.kind }),

    execute: async ({ actor, operationAt: now }, input) => {
      const notifications = application.notifications;

      await notifications.enqueue(
        [
          {
            id: NotificationIntentId.trust(
              `broadcast:${actor.userId}:${randomUUIDv7()}`,
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
        now,
      );

      return Ok(undefined);
    },
  });
}
