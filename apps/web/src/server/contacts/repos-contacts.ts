import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createContactId } from "~/server/shared/ids";

export function createContactsRepo(db: Kysely<Database>) {
  return {
    findById(id: string) {
      return db
        .selectFrom("contacts")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByDni(dni: string) {
      return db
        .selectFrom("contacts")
        .selectAll()
        .where("dni", "=", dni)
        .executeTakeFirst();
    },

    async findOrCreate(
      orgId: string,
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

    updateCooldown(id: string, userId: string, cooldownUntil: number) {
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
