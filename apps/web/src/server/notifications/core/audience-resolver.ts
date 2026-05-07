import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export async function resolveRecipientsFromTargets(
  db: Kysely<Database>,
  intentId: string,
): Promise<number[]> {
  const targets = await db
    .selectFrom("notification_intent_targets")
    .selectAll()
    .where("intent_id", "=", intentId)
    .execute();

  const recipientIds = new Set<number>();

  for (const target of targets) {
    if (target.target_kind === "user_id" && target.user_id !== null) {
      recipientIds.add(target.user_id);
      continue;
    }

    if (
      target.target_kind === "branch_role" &&
      target.branch_id !== null &&
      target.role !== null
    ) {
      const rows = await db
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", target.branch_id)
        .where("role", "=", target.role as never)
        .where("is_active", "=", 1)
        .execute();
      for (const row of rows) recipientIds.add(row.id);
      continue;
    }

    if (target.target_kind === "global_role" && target.role !== null) {
      const rows = await db
        .selectFrom("users")
        .select("id")
        .where("role", "=", target.role as never)
        .where("is_active", "=", 1)
        .execute();
      for (const row of rows) recipientIds.add(row.id);
      continue;
    }

    if (target.target_kind === "team_id" && target.team_id !== null) {
      const rows = await db
        .selectFrom("users")
        .select("id")
        .where("team_id", "=", target.team_id)
        .where("is_active", "=", 1)
        .execute();
      for (const row of rows) recipientIds.add(row.id);
    }
  }

  return [...recipientIds];
}

export async function resolveChannelAddress(
  db: Kysely<Database>,
  userId: number,
  channel: "email" | "whatsapp",
): Promise<string | null> {
  const row = await db
    .selectFrom("user_channel_addresses")
    .select("address")
    .where("user_id", "=", userId)
    .where("channel", "=", channel)
    .where("is_verified", "=", 1)
    .executeTakeFirst();
  return row?.address ?? null;
}
