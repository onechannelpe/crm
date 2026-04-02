import type { Insertable } from "kysely";

import type { Database } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export type LeadDraft = Insertable<Database["pipeline_leads"]>;

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function createLeadDraft(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  now: number;
}): Result<LeadDraft, DomainError> {
  const ruc = input.ruc.trim();
  if (!/^\d{11}$/.test(ruc)) {
    return fail("invalid_ruc", "RUC must be an 11 digit string");
  }

  return Ok({
    ruc,
    razon_social: input.razonSocial,
    address: input.address,
    executive_id: input.executiveId,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    created_at: input.now,
    updated_at: input.now,
  });
}
