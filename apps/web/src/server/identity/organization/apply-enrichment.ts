import type { PartyRepository } from "./repo";

// The registry fields projected onto the organization. SUNAT is authoritative,
// so a non-null value always wins; null fields are left untouched (the engine
// fallback supplies only legalName/address).
export type RegistryProjection = {
  ruc: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

function normalize(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Projects the latest registry data onto the organization row. Called inline by
// the enrichment worker after a scrape (or engine fallback) -- a single
// idempotent local write, not a queue. A missing organization is a no-op.
export function createOrganizationEnrichmentProjection(party: PartyRepository) {
  return async function apply(projection: RegistryProjection): Promise<void> {
    const next: {
      legalName?: string;
      address?: string;
      district?: string;
      department?: string;
    } = {};

    const legalName = normalize(projection.legalName);
    if (legalName !== null) next.legalName = legalName;
    const address = normalize(projection.address);
    if (address !== null) next.address = address;
    const district = normalize(projection.district);
    if (district !== null) next.district = district;
    const department = normalize(projection.department);
    if (department !== null) next.department = department;

    if (Object.keys(next).length < 1) return;

    const organization = await party.findOrganizationByRuc(projection.ruc);
    if (!organization) return;

    await party.updateOrganizationFromEnrichment({
      organizationId: organization.id,
      ...next,
    });
  };
}
