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
  const existingOrganizations = await db
    .selectFrom("organizations")
    .select(["id", "ruc"])
    .where(
      "ruc",
      "in",
      organizationKeys.map((key) => ORGANIZATIONS[key].ruc),
    )
    .execute();
  const existingIdByRuc = new Map(
    existingOrganizations.map((row) => [row.ruc, row.id]),
  );
  const organizationIdByKey = new Map<OrganizationSeedKey, OrganizationId>();
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
    const existingId = existingIdByRuc.get(organization.ruc);
    const id = existingId ?? randomUUIDv7();
    organizationIdByKey.set(key, id);
    if (existingId) {
      continue;
    }
    organizationsToInsert.push({
      id,
      ...organization,
      created_at: now,
    });
  }

  if (organizationsToInsert.length > 0) {
    await db
      .insertInto("organizations")
      .values(organizationsToInsert)
      .execute();
  }

  const getOrganizationId = (key: OrganizationSeedKey): OrganizationId => {
    const organizationId = organizationIdByKey.get(key);
    if (!organizationId) {
      throw new Error(`missing_seed_organization_id:${key}`);
    }
    return organizationId;
  };
  return { getOrganizationId };
}
