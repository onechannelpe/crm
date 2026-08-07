import type { Kysely } from "kysely";

import type { OrganizationPersonId, UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

// Last-contacted timestamp + cooldown window per membership. Owned by
// contact-assignments (not the organization identity row). Read by
// canContactNow; written by touch.
export type CadenceSnapshot = {
  organizationPersonId: OrganizationPersonId;
  lastContactedAt: Date | null;
  cooldownUntil: Date | null;
};

export function createContactCadenceRepo(db: Kysely<Database>) {
  const findMany = async (
    organizationPersonIds: OrganizationPersonId[],
  ): Promise<Map<OrganizationPersonId, CadenceSnapshot>> => {
    if (organizationPersonIds.length === 0) {
      return new Map();
    }
    const rows = await db
      .selectFrom("contact_cadence")
      .selectAll()
      .where("organization_person_id", "in", organizationPersonIds)
      .execute();

    return new Map(
      rows.map((row) => [
        row.organization_person_id,
        {
          organizationPersonId: row.organization_person_id,
          lastContactedAt: row.last_contacted_at,
          cooldownUntil: row.cooldown_until,
        },
      ]),
    );
  };

  const touch = (input: {
    organizationPersonId: OrganizationPersonId;
    userId: UserId;
    contactedAt: Date;
    cooldownUntil: Date | null;
  }) =>
    db
      .insertInto("contact_cadence")
      .values({
        organization_person_id: input.organizationPersonId,
        last_contacted_at: input.contactedAt,
        last_contacted_by_user_id: input.userId,
        cooldown_until: input.cooldownUntil,
      })
      .onConflict((oc) =>
        oc.column("organization_person_id").doUpdateSet({
          last_contacted_at: input.contactedAt,
          last_contacted_by_user_id: input.userId,
          cooldown_until: input.cooldownUntil,
        }),
      )
      .execute();

  return { findMany, touch };
}

export type ContactCadenceRepo = ReturnType<typeof createContactCadenceRepo>;
