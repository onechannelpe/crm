import type { LeadAvailableAction } from "~/contracts/workflow";
import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import {
  canApproveForSale,
  canRequestRateNegotiation,
  requireLeadAccess,
  requirePipelineActionAccess,
} from "./access";

export const MAX_NEGOTIATION_FILES = 3;
export const MAX_NEGOTIATION_ROUNDS = 3;

type LeadActionPolicyBaseInput = {
  actorUserId: number;
  actorRole: Role;
  lead: LeadRecord;
};

type LeadActionPolicyInput =
  | (LeadActionPolicyBaseInput & {
      action: Extract<LeadAvailableAction, "approve-for-sale">;
    })
  | (LeadActionPolicyBaseInput & {
      action: Extract<LeadAvailableAction, "request-rate-negotiation">;
      negotiationRequestCount: number;
      artifactCount: number;
    });

export function requireLeadActionAccess(
  input: LeadActionPolicyInput,
): Result<void, DomainError> {
  const canRunAction = requirePipelineActionAccess(
    input.actorRole,
    input.action === "approve-for-sale"
      ? canApproveForSale
      : canRequestRateNegotiation,
  );
  if (!canRunAction.ok) return canRunAction;

  const leadAccess = requireLeadAccess({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    executiveId: input.lead.executiveId,
  });
  if (!leadAccess.ok) return leadAccess;

  if (input.lead.stage !== "QUOTED") {
    return Err(
      domainError("conflict", "invalid_lead_stage", "Invalid lead stage"),
    );
  }

  if (input.action === "approve-for-sale") return canRunAction;

  if (input.negotiationRequestCount >= MAX_NEGOTIATION_ROUNDS) {
    return Err(
      domainError(
        "conflict",
        "max_negotiation_rounds_reached",
        `Maximum of ${MAX_NEGOTIATION_ROUNDS} negotiation rounds allowed`,
      ),
    );
  }

  if (input.artifactCount > MAX_NEGOTIATION_FILES) {
    return Err(
      domainError(
        "validation",
        "max_negotiation_files_exceeded",
        `Maximum of ${MAX_NEGOTIATION_FILES} negotiation files allowed`,
      ),
    );
  }

  return canRunAction;
}
