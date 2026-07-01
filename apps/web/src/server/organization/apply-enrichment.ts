import type { OrganizationRepository } from "./organization-repo";

// The registry fields projected onto the organization. SUNAT is authoritative,
// so a non-null value always wins; null/blank fields are dropped so a partial
// (engine-fallback) result never overwrites known columns.
export type RegistryProjection = {
  ruc: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

function present(value: string | null): string | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Projects the latest registry data onto the organization. Called inline by the
// enrichment worker after a scrape (or engine fallback) -- a single idempotent
// UPDATE by RUC, not a queue. A missing organization is a no-op.
export function createOrganizationEnrichmentProjection(
  organizations: OrganizationRepository,
) {
  return function apply(projection: RegistryProjection): Promise<void> {
    return organizations.applyEnrichment({
      ruc: projection.ruc,
      legalName: present(projection.legalName),
      address: present(projection.address),
      district: present(projection.district),
      department: present(projection.department),
    });
  };
}
