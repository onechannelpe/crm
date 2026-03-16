import type { NewAppNotification, UsersTable } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";

import type { AppNotificationEvent } from "./app-events";

interface Deps {
  repos: Pick<Repositories, "appNotifications" | "users">;
}

function serializeMetadata(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  return JSON.stringify(metadata);
}

export function createAppNotificationCenter({ repos }: Deps) {
  async function notifyUsers(
    userIds: number[],
    event: AppNotificationEvent,
    now = Date.now(),
  ): Promise<void> {
    const unique = Array.from(new Set(userIds.filter((id) => id > 0)));
    if (unique.length === 0) return;

    const rows: NewAppNotification[] = unique.map((userId) => ({
      user_id: userId,
      event_type: event.type,
      priority: event.priority,
      title: event.title,
      body_text: event.bodyText,
      action_url: event.actionUrl,
      dedupe_key: event.dedupeKey,
      metadata_json: serializeMetadata(event.metadata),
      created_at: now,
      read_at: null,
    }));
    await repos.appNotifications.createMany(rows);
  }

  return {
    notifyUsers,

    async notifyBranchRoles(
      branchId: number,
      roles: UsersTable["role"][],
      event: AppNotificationEvent,
      now = Date.now(),
    ): Promise<void> {
      const audience = await repos.users.findActiveIdsByBranchAndRoles(
        branchId,
        roles,
      );
      await notifyUsers(
        audience.map((it) => it.id),
        event,
        now,
      );
    },
  };
}
