import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import {
  asContactId,
  asOrganizationId,
  asUserId,
  createContactId,
  type ContactId,
  type OrganizationId,
  type UserId,
} from "~/server/shared/ids";

type HydratedContactRow = Omit<
  Database["contacts"],
  "id" | "organization_id" | "last_contacted_by_user_id"
> & {
  id: ContactId;
  organization_id: OrganizationId;
  last_contacted_by_user_id: UserId | null;
};

function mapContactRow(row: Database["contacts"]): HydratedContactRow {
  return {
    ...row,
    id: asContactId(row.id),
    organization_id: asOrganizationId(row.organization_id),
    last_contacted_by_user_id:
      row.last_contacted_by_user_id === null
        ? null
        : asUserId(row.last_contacted_by_user_id),
  };
}

export function createContactsRepo(db: Kysely<Database>) {
  return {
    findById(id: ContactId) {
      return db
        .selectFrom("contacts")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()
        .then((row) => (row ? mapContactRow(row) : undefined));
    },

    findByDni(dni: string) {
      return db
        .selectFrom("contacts")
        .selectAll()
        .where("dni", "=", dni)
        .executeTakeFirst()
        .then((row) => (row ? mapContactRow(row) : undefined));
    },

    async findOrCreate(
      orgId: OrganizationId,
      dni: string,
      name: string,
      phonePrimary: string | null,
    ) {
      const existing = await this.findByDni(dni);
      if (existing) return existing;

      const id = createContactId();
      await db
        .insertInto("contacts")
        .values({
          id,
          organization_id: orgId,
          dni,
          name,
          phone_primary: phonePrimary,
          created_at: Date.now(),
        })
        .executeTakeFirstOrThrow();

      const created = await this.findById(id);
      if (!created) {
        throw new Error("Failed to load contact after creation");
      }
      return created;
    },

    updateCooldown(id: ContactId, userId: UserId, cooldownUntil: number) {
      return db
        .updateTable("contacts")
        .set({
          last_contacted_at: Date.now(),
          last_contacted_by_user_id: userId,
          cooldown_until: cooldownUntil,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}
