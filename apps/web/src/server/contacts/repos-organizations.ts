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
      const id = randomUUIDv7();
      await db
        .insertInto("organizations")
        .values({ id, ruc, legal_name: name, created_at: Date.now() })
        .onConflict((oc) => oc.column("ruc").doNothing())
        .executeTakeFirstOrThrow();

      const organization = await this.findByRuc(ruc);
      if (!organization) {
        throw new Error("Failed to load organization after upsert");
      }
      return organization;
    },

    lockToBranch(orgId: OrganizationId, branchId: number, userId: number) {
      return db
        .insertInto("organization_branch_locks")
        .values({
          organization_id: orgId,
          branch_id: branchId,
          locked_at: Date.now(),
          locked_by_user_id: userId,
        })
        .onConflict((oc) =>
          oc.column("organization_id").doUpdateSet({
            branch_id: branchId,
            locked_at: Date.now(),
            locked_by_user_id: userId,
          }),
        )
        .execute();
    },

    findUnlocked(limit: number) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom("organization_branch_locks as lock")
                .select("lock.organization_id")
                .whereRef("lock.organization_id", "=", "organizations.id"),
            ),
          ),
        )
        .limit(limit)
        .execute();
    },

    findUnlockedOrLockedToBranch(branchId: number, limit: number) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where((eb) =>
          eb.or([
            eb.not(
              eb.exists(
                eb
                  .selectFrom("organization_branch_locks as lock")
                  .select("lock.organization_id")
                  .whereRef("lock.organization_id", "=", "organizations.id"),
              ),
            ),
            eb.exists(
              eb
                .selectFrom("organization_branch_locks as lock")
                .select("lock.organization_id")
                .whereRef("lock.organization_id", "=", "organizations.id")
                .where("lock.branch_id", "=", branchId),
            ),
          ]),
        )
        .limit(limit)
        .execute();
    },
  };
}

export type OrganizationsRepo = ReturnType<typeof createOrganizationsRepo>;
