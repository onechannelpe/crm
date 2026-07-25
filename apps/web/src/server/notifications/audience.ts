import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

import type { NotificationAudience } from "./types";

export async function resolveAudience(
  db: Kysely<Database>,
  audience: NotificationAudience,
): Promise<UserId[]> {
  if (audience.kind === "user_ids") {
    return audience.userIds;
  }
  if (audience.kind === "branch_role") {
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("branch_id", "=", audience.branchId)
      .where("role", "=", audience.role)
      .where("is_active", "=", true)
      .execute();
    return rows.map((r) => r.id);
  }
  if (audience.kind === "global_role") {
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("role", "=", audience.role)
      .where("is_active", "=", true)
      .execute();
    return rows.map((r) => r.id);
  }
  const rows = await db
    .selectFrom("users")
    .select("id")
    .where("team_id", "=", audience.teamId)
    .where("is_active", "=", true)
    .execute();
  return rows.map((r) => r.id);
}
