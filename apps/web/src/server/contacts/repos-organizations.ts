import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { OrganizationId } from "~/server/shared/ids";

export function createOrganizationsRepo(db: Kysely<Database>) {
  return {
    findById(id: OrganizationId) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByRuc(ruc: string) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
    },

    async findOrCreate(ruc: string, name: string) {
      const existing = await this.findByRuc(ruc);
      if (existing) return existing;

      const id = randomUUIDv7();
      await db
        .insertInto("organizations")
        .values({ id, ruc, name, created_at: Date.now() })
        .executeTakeFirstOrThrow();

      const created = await this.findById(id);
      if (!created) {
        throw new Error("Failed to load organization after creation");
      }
      return created;
    },

    lockToBranch(orgId: OrganizationId, branchId: number, userId: number) {
      return db
        .updateTable("organizations")
        .set({
          locked_branch_id: branchId,
          locked_at: Date.now(),
          locked_by_user_id: userId,
        })
        .where("id", "=", orgId)
        .execute();
    },

    findUnlocked(limit: number) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where("locked_branch_id", "is", null)
        .limit(limit)
        .execute();
    },

    findUnlockedOrLockedToBranch(branchId: number, limit: number) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where((eb) =>
          eb.or([
            eb("locked_branch_id", "is", null),
            eb("locked_branch_id", "=", branchId),
          ]),
        )
        .limit(limit)
        .execute();
    },
  };
}
