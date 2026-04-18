import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import {
  asBranchId,
  asOrganizationId,
  asUserId,
  createOrganizationId,
  type BranchId,
  type OrganizationId,
  type UserId,
} from "~/server/shared/ids";

type HydratedOrganizationRow = Omit<
  Database["organizations"],
  "id" | "locked_branch_id" | "locked_by_user_id"
> & {
  id: OrganizationId;
  locked_branch_id: BranchId | null;
  locked_by_user_id: UserId | null;
};

function mapOrganizationRow(
  row: Database["organizations"],
): HydratedOrganizationRow {
  return {
    ...row,
    id: asOrganizationId(row.id),
    locked_branch_id:
      row.locked_branch_id === null ? null : asBranchId(row.locked_branch_id),
    locked_by_user_id:
      row.locked_by_user_id === null ? null : asUserId(row.locked_by_user_id),
  };
}

export function createOrganizationsRepo(db: Kysely<Database>) {
  return {
    findById(id: OrganizationId) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()
        .then((row) => (row ? mapOrganizationRow(row) : undefined));
    },

    findByRuc(ruc: string) {
      return db
        .selectFrom("organizations")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst()
        .then((row) => (row ? mapOrganizationRow(row) : undefined));
    },

    async findOrCreate(ruc: string, name: string) {
      const existing = await this.findByRuc(ruc);
      if (existing) return existing;

      const id = createOrganizationId();
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

    lockToBranch(orgId: OrganizationId, branchId: BranchId, userId: UserId) {
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
        .execute()
        .then((rows) => rows.map(mapOrganizationRow));
    },

    findUnlockedOrLockedToBranch(branchId: BranchId, limit: number) {
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
        .execute()
        .then((rows) => rows.map(mapOrganizationRow));
    },
  };
}
