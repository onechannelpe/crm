import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { OrganizationId } from "~/server/shared/ids";

export function createContactsRepo(db: Kysely<Database>) {
  const findById = (id: number) =>
    db
      .selectFrom("organization_people")
      .innerJoin("people", "people.id", "organization_people.person_id")
      .select([
        "organization_people.id",
        "organization_people.organization_id",
        "organization_people.dni",
        "organization_people.telefono as phone_primary",
        "organization_people.last_contacted_at",
        "organization_people.cooldown_until",
        "people.full_name as name",
        "people.email",
      ])
      .where("organization_people.id", "=", id)
      .executeTakeFirst();

  const findByOrgAndDni = (orgId: OrganizationId, dni: string) =>
    db
      .selectFrom("organization_people")
      .innerJoin("people", "people.id", "organization_people.person_id")
      .select([
        "organization_people.id",
        "organization_people.organization_id",
        "organization_people.dni",
        "organization_people.telefono as phone_primary",
        "organization_people.last_contacted_at",
        "organization_people.cooldown_until",
        "people.full_name as name",
        "people.email",
      ])
      .where("organization_people.organization_id", "=", orgId)
      .where("organization_people.dni", "=", dni)
      .executeTakeFirst();

  const findOrCreate = async (
    orgId: OrganizationId,
    dni: string,
    name: string,
    phonePrimary: string | null,
  ) => {
    const now = Date.now();
    await db
      .insertInto("people")
      .values({
        dni,
        full_name: name,
        email: null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column("dni").doUpdateSet({
          full_name: name,
          updated_at: now,
        }),
      )
      .executeTakeFirstOrThrow();

    const person = await db
      .selectFrom("people")
      .select(["id", "dni"])
      .where("dni", "=", dni)
      .executeTakeFirst();
    if (!person) {
      throw new Error("Failed to load person after upsert");
    }

    await db
      .insertInto("organization_people")
      .values({
        person_id: person.id,
        organization_id: orgId,
        dni,
        nombres: name,
        apellido_paterno: "-",
        apellido_materno: "-",
        telefono: phonePrimary,
        email: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: null,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(["organization_id", "person_id"]).doUpdateSet({
          telefono: phonePrimary,
          updated_at: now,
        }),
      )
      .executeTakeFirstOrThrow();

    const member = await findByOrgAndDni(orgId, dni);
    if (!member) {
      throw new Error("Failed to load organization person after upsert");
    }
    return member;
  };

  const updateCooldown = (id: number, userId: number, cooldownUntil: number) =>
    db
      .updateTable("organization_people")
      .set({
        last_contacted_at: Date.now(),
        last_contacted_by_user_id: userId,
        cooldown_until: cooldownUntil,
        updated_at: Date.now(),
      })
      .where("id", "=", id)
      .execute();

  return {
    findById,
    findByOrgAndDni,
    findOrCreate,
    updateCooldown,
  };
}

export type ContactsRepo = ReturnType<typeof createContactsRepo>;
