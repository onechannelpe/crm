import type { OrganizationRepository } from "./organization-repo";

type OrganizationEnrichmentWriter = Pick<
  OrganizationRepository,
  "applyEnrichment"
>;

// SUNAT is authoritative: a non-null value always wins. Null/blank fields are
// dropped so a partial (engine-fallback) result never overwrites known columns.
export type RegistryProjection = {
  ruc: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

function present(value: string | null): string | undefined {
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Single idempotent UPDATE by RUC, not a queue. Called inline by the
// enrichment worker after a scrape (or engine fallback). A missing
// organization is a no-op.
export function createOrganizationEnrichmentProjection(
  organizations: OrganizationEnrichmentWriter,
) {
  return function apply(projection: RegistryProjection): Promise<void> {
    const legalName = present(projection.legalName);
    const address = present(projection.address);
    const district = present(projection.district);
    const department = present(projection.department);

    if (
      legalName === undefined &&
      address === undefined &&
      district === undefined &&
      department === undefined
    ) {
      return Promise.resolve();
    }

    return organizations.applyEnrichment({
      ruc: projection.ruc,
      legalName,
      address,
      district,
      department,
    });
  };
}
