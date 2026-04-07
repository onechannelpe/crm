import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { LeadBootstrapPreviewDeps } from "../deps/lead-queries";
import type { LeadBootstrapPreviewView } from "./views/lead-bootstrap-preview";

export async function getLeadBootstrapPreview(
  deps: LeadBootstrapPreviewDeps,
  input: { ruc: string },
): Promise<Result<LeadBootstrapPreviewView, DomainError>> {
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
