import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import { safeParseObject } from "./json";

export async function resolveRecipients(
  db: Kysely<Database>,
  audienceKind: string,
  audiencePayloadJson: string,
): Promise<number[]> {
  const payload = safeParseObject(audiencePayloadJson);
  if (!payload) {
    return [];
  }

  if (audienceKind === "user_ids") {
    return Array.isArray(payload.user_ids)
      ? payload.user_ids.filter(
          (value): value is number => typeof value === "number",
        )
      : [];
  }

  if (audienceKind === "branch_roles") {
    const branchId =
      typeof payload.branch_id === "number" ? payload.branch_id : null;
    const roles = Array.isArray(payload.branch_roles)
      ? payload.branch_roles.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    if (branchId === null || roles.length < 1) {
      return [];
    }
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("branch_id", "=", branchId)
      .where("role", "in", roles as Array<"back_office">)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((row) => row.id);
  }

  if (audienceKind === "global_roles") {
    const roles = Array.isArray(payload.global_roles)
      ? payload.global_roles.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    if (roles.length < 1) {
      return [];
    }
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("role", "in", roles as Array<"admin">)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((row) => row.id);
  }

  if (audienceKind === "team") {
    const teamId = typeof payload.team_id === "number" ? payload.team_id : null;
    if (teamId === null) {
      return [];
    }
    const rows = await db
      .selectFrom("users")
      .select("id")
      .where("team_id", "=", teamId)
      .where("is_active", "=", 1)
      .execute();
    return rows.map((row) => row.id);
  }

  return [];
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
