import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { OrganizationId } from "~/server/shared/ids";

import type { Database } from "../../../types";
import { ORGANIZATIONS, type OrganizationSeedKey } from "../scenario";

export type OrganizationLookup = {
  getOrganizationId: (key: OrganizationSeedKey) => OrganizationId;
};

export async function persistOrganizations(
  db: Kysely<Database>,
  organizationKeys: readonly OrganizationSeedKey[],
  now: number,
): Promise<OrganizationLookup> {
  const organizationsToInsert: Array<{
    id: OrganizationId;
    ruc: string;
    name: string;
    address: string;
    district: string;
    department: string;
    created_at: number;
  }> = [];

  for (const key of organizationKeys) {
    const organization = ORGANIZATIONS[key];
    organizationsToInsert.push({
      id: randomUUIDv7(),
      ...organization,
      created_at: now,
    });
  }

  await db
    .insertInto("organizations")
    .values(organizationsToInsert)
    .onConflict((oc) => oc.column("ruc").doNothing())
    .execute();

  const organizationsInDb = await db
    .selectFrom("organizations")
    .select(["id", "ruc"])
    .where(
      "ruc",
      "in",
      organizationKeys.map((key) => ORGANIZATIONS[key].ruc),
    )
    .execute();
  const organizationIdByRuc = new Map(
    organizationsInDb.map((row) => [row.ruc, row.id]),
  );

  const getOrganizationId = (key: OrganizationSeedKey): OrganizationId => {
    const organizationId = organizationIdByRuc.get(ORGANIZATIONS[key].ruc);
    if (!organizationId) {
      throw new Error(`missing_seed_organization_id:${key}`);
    }
    return organizationId;
  };
  return { getOrganizationId };
}
