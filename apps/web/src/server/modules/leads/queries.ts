"use server";

import { query } from "@solidjs/router";
import { db } from "~/server/db/client";
import { requireRole } from "~/server/auth/session";

export const getActiveLeadsQuery = query(async () => {
  "use server";
  const { userId } = await requireRole(["executive"]);

  return await db
    .selectFrom("lead_assignments")
    .where("user_id", "=", userId)
    .where("status", "=", "Active")
    .selectAll()
    .execute();
}, "activeLeads");
