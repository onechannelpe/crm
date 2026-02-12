import type { Kysely } from "kysely";
import type { Database, NewContact } from "~/lib/db/schema";

export function createContactsRepo(db: Kysely<Database>) {
    return {
        findById(id: number) {
            return db.selectFrom("contacts").selectAll().where("id", "=", id).executeTakeFirst();
        },

        findByDni(dni: string) {
            return db.selectFrom("contacts").selectAll().where("dni", "=", dni).executeTakeFirst();
        },

        async findOrCreate(orgId: number, dni: string, name: string, phonePrimary: string | null) {
            const existing = await this.findByDni(dni);
            if (existing) return existing;

            const result = await db
                .insertInto("contacts")
                .values({
                    organization_id: orgId,
                    dni,
                    name,
                    phone_primary: phonePrimary,
                    created_at: Date.now(),
                })
                .executeTakeFirstOrThrow();

            return (await this.findById(Number(result.insertId)))!;
        },

        updateCooldown(id: number, userId: number, cooldownUntil: number) {
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
