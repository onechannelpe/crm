import type { Insertable } from "kysely";

import type { AppNotificationsTable, UsersTable } from "~/lib/db/types";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

import type { AppNotificationEvent } from "./app-events";

type NewAppNotificationRow = Insertable<AppNotificationsTable>;

interface Deps {
  repos: {
    appNotifications: {
      createMany(values: NewAppNotificationRow[]): Promise<void>;
    };
    users: {
      findActiveIdsByBranchAndRoles(
        branchId: BranchId,
        roles: UsersTable["role"][],
      ): Promise<Array<{ id: number }>>;
    };
  };
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

    const rows: NewAppNotificationRow[] = unique.map((userId) => ({
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
      branchId: BranchId,
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
