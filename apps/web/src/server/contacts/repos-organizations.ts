import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { BranchId, OrganizationId, UserId } from "~/server/shared/ids";

export function createOrganizationsRepo(db: Kysely<Database>) {
  const findById = (id: OrganizationId) =>
    db
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

  const findByRuc = (ruc: string) =>
    db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirst();

  const findOrCreate = async (ruc: string, name: string) => {
    const id = randomUUIDv7();
    await db
      .insertInto("organizations")
      .values({ id, ruc, legal_name: name, created_at: new Date() })
      .onConflict((oc) => oc.column("ruc").doNothing())
      .executeTakeFirstOrThrow();

    const organization = await findByRuc(ruc);
    if (!organization) {
      throw new Error("Failed to load organization after upsert");
    }
    return organization;
  };

  const lockToBranch = (
    orgId: OrganizationId,
    branchId: BranchId,
    userId: UserId,
  ) =>
    db
      .insertInto("organization_branch_locks")
      .values({
        organization_id: orgId,
        branch_id: branchId,
        locked_at: new Date(),
        locked_by_user_id: userId,
      })
      .onConflict((oc) =>
        oc.column("organization_id").doUpdateSet({
          branch_id: branchId,
          locked_at: new Date(),
          locked_by_user_id: userId,
        }),
      )
      .execute();

  const findUnlocked = (limit: number) =>
    db
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

  const findUnlockedOrLockedToBranch = (branchId: BranchId, limit: number) =>
    db
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

  return {
    findById,
    findByRuc,
    findOrCreate,
    lockToBranch,
    findUnlocked,
    findUnlockedOrLockedToBranch,
  };
}

export type OrganizationsRepo = ReturnType<typeof createOrganizationsRepo>;
