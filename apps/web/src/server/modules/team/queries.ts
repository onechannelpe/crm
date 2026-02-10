"use server";

import { query } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireAuth } from "~/server/auth/session";

export const getTeamUsersQuery = query(async () => {
  "use server";
  await requireAuth();

  return await db
    .selectFrom("users")
    .select(["id", "email", "full_name", "role"])
    .where("is_active", "=", 1)
    .execute();
}, "teamUsers");
