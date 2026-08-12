import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { persistInstallation } from "./persist/core";

export async function provisionInstallation(
  db: Kysely<Database>,
  seededAt: Date,
): Promise<void> {
  await persistInstallation(db, seededAt);
  await verifyInstallation(db);
}

export async function verifyInstallation(db: Kysely<Database>): Promise<void> {
  const administrator = await db
    .selectFrom("users")
    .select("id")
    .where("is_active", "=", true)
    .where("role", "in", ["admin", "superuser"])
    .limit(1)
    .executeTakeFirst();
  if (!administrator) {
    throw new Error("installation_has_no_active_administrator");
  }
}
