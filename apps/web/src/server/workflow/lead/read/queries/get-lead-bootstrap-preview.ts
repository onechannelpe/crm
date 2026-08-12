import type { LeadBootstrapPreviewView } from "~/contracts/workflow/views";
import type { DomainError } from "~/domain/errors";
import type { OrganizationEnrichment } from "~/server/organization/enrichment";
import type { OrganizationRepository } from "~/server/organization/organization-repo";
import { Ok, type Result } from "~/shared/result";

export async function getLeadBootstrapPreview(
  deps: { organization: OrganizationRepository },
  enrichment: OrganizationEnrichment,
  input: { ruc: string },
): Promise<Result<LeadBootstrapPreviewView, DomainError>> {
  const existingOrganization = await deps.organization.findOrganizationByRuc(
    input.ruc,
  );
  if (existingOrganization) {
    return Ok({
      legalName: existingOrganization.legalName,
      address: existingOrganization.address,
      engineStatus: "available",
    });
  }

  const preview = await enrichment.enrichByRuc(input.ruc);

  if (!preview) {
    return Ok({
      legalName: null,
      address: null,
      engineStatus: "missing",
    });
  }

  return Ok({
    legalName: preview.legalName,
    address: preview.address,
    engineStatus: "available",
  });
}
