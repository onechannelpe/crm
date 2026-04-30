import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadBootstrapPreviewDeps } from "../deps/lead-queries";
import type { WorkflowEngineGateway } from "../ports/engine-gateway";
import type { LeadBootstrapPreviewView } from "./views/lead-bootstrap-preview";

export async function getLeadBootstrapPreview(
  deps: LeadBootstrapPreviewDeps,
  engineGateway: WorkflowEngineGateway,
  input: { ruc: string },
): Promise<Result<LeadBootstrapPreviewView, DomainError>> {
  const existingOrganization = await deps.party.findOrganizationByRuc(
    input.ruc,
  );
  if (existingOrganization) {
    return Ok({
      razonSocial: existingOrganization.name,
      address: existingOrganization.address,
      engineStatus: "available",
    });
  }

  const preview = await engineGateway.enrichByRuc(input.ruc);

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
