import type { LeadBootstrapPreviewView } from "~/contracts/workflow/views";
import type { PartyRepository } from "~/server/identity/organization/repo";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { EnrichmentReader } from "~/server/workflow/lead/read/ports";

export async function getLeadBootstrapPreview(
  deps: { party: PartyRepository },
  engineGateway: EnrichmentReader,
  input: { ruc: string },
): Promise<Result<LeadBootstrapPreviewView, DomainError>> {
  const existingOrganization = await deps.party.findOrganizationByRuc(
    input.ruc,
  );
  if (existingOrganization) {
    return Ok({
      legalName: existingOrganization.legalName,
      address: existingOrganization.address,
      engineStatus: "available",
    });
  }

  const preview = await engineGateway.enrichByRuc(input.ruc);

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
