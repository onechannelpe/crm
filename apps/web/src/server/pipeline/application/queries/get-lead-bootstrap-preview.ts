import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadBootstrapPreviewDeps } from "../deps/lead-queries";
import type { LeadBootstrapPreviewView } from "./views/lead-bootstrap-preview";

export async function getLeadBootstrapPreview(
  deps: LeadBootstrapPreviewDeps,
  input: { ruc: string },
): Promise<Result<LeadBootstrapPreviewView, DomainError>> {
  // Check if lead exists with stored engine data
  const existingLead = await deps.leads.findByRuc(input.ruc);
  if (
    existingLead &&
    existingLead.engineCompanyName &&
    existingLead.engineFetchedAt
  ) {
    return Ok({
      razonSocial: existingLead.engineCompanyName,
      address: existingLead.engineAddress,
      engineStatus: "available",
    });
  }

  // Fallback to engine gateway for new RUCs or if no cached data
  const preview = await deps.engineGateway.enrichByRuc(input.ruc);

  if (!preview) {
    return Ok({
      razonSocial: null,
      address: null,
      engineStatus: "missing",
    });
  }

  return Ok({
    razonSocial: preview.razonSocial,
    address: preview.address,
    engineStatus: "available",
  });
}
