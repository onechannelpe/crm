import type { LeadStage, LeadStatus, Prioridad } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export type LeadAvailableAction =
  | "log-call"
  | "add-note"
  | "complete-commercial-input"
  | "create-sale"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "reassign-lead";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function buildLeadDraft(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  now: number;
}) {
  if (!/^\d+$/.test(input.ruc)) {
    return fail("invalid_ruc", "RUC must be a numeric string");
  }

  return Ok({
    ruc: input.ruc,
    razon_social: input.razonSocial,
    address: input.address,
    executive_id: input.executiveId,
    stage: "PENDING_EXTERNAL_REVIEW" as const,
    status: null,
    prioridad: null,
    created_at: input.now,
    updated_at: input.now,
  });
}

export function resolveReviewStage(input: {
  currentStage: LeadStage;
  status: LeadStatus;
  prioridad: Prioridad;
}): Result<LeadStage, DomainError> {
  if (input.currentStage !== "PENDING_EXTERNAL_REVIEW") {
    return fail(
      "invalid_stage",
      "Lead must be pending external review to be reviewed",
    );
  }

  if (input.status === "CARTERIZADO" || input.status === "STOCK") {
    return Ok("REJECTED_BY_STATUS");
  }

  if (input.prioridad === "SIN RESULTADO") {
    return Ok("NEEDS_EXECUTIVE_INPUT");
  }

  return Ok("READY_FOR_QUOTATION");
}

export function ensureLeadCanCompleteCommercialInput(input: {
  stage: LeadStage;
  executiveId: number;
  actorUserId: number;
}): Result<void, DomainError> {
  if (input.stage !== "NEEDS_EXECUTIVE_INPUT") {
    return fail("invalid_stage", "Lead is not awaiting executive input");
  }

  if (input.executiveId !== input.actorUserId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can complete input",
      ),
    );
  }

  return Ok(undefined);
}

export function ensureLeadCanCreateQuotation(
  stage: LeadStage,
): Result<void, DomainError> {
  if (stage !== "READY_FOR_QUOTATION") {
    return fail(
      "invalid_stage",
      "Lead must be ready for quotation before creating a quotation",
    );
  }

  return Ok(undefined);
}

export function ensureLeadCanApproveForSale(
  stage: LeadStage,
): Result<void, DomainError> {
  if (stage !== "QUOTED") {
    return fail(
      "invalid_stage",
      "Lead must be quoted before it can be approved for sale",
    );
  }

  return Ok(undefined);
}

export function ensureLeadCanCreateSale(input: {
  stage: LeadStage;
  executiveId: number;
  actorUserId: number;
  banco: string;
  cci: string | null;
}): Result<void, DomainError> {
  if (input.stage !== "READY_FOR_SALE") {
    return fail("invalid_stage", "Lead must be ready for sale");
  }

  if (input.executiveId !== input.actorUserId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create the sale",
      ),
    );
  }

  if (input.banco.trim().toUpperCase() !== "BCP" && !input.cci?.trim()) {
    return fail(
      "missing_cci",
      "CCI is required when the selected bank is not BCP",
    );
  }

  return Ok(undefined);
}

export function ensureLeadCanReassign(input: {
  currentExecutiveId: number;
  newExecutiveId: number;
}): Result<void, DomainError> {
  if (input.currentExecutiveId === input.newExecutiveId) {
    return fail(
      "same_executive",
      "Lead is already assigned to the selected executive",
    );
  }

  return Ok(undefined);
}

export function resolveLeadAvailableActions(input: {
  stage: LeadStage;
  canLogTimeline: boolean;
  canCompleteCommercialInput: boolean;
  canCreateSale: boolean;
  canReviewLead: boolean;
  canCreateQuotation: boolean;
  canApproveForSale: boolean;
  canReassignLead: boolean;
}) {
  const actions: LeadAvailableAction[] = [];

  if (input.canLogTimeline) {
    actions.push("log-call", "add-note");
  }

  if (
    input.canCompleteCommercialInput &&
    input.stage === "NEEDS_EXECUTIVE_INPUT"
  ) {
    actions.push("complete-commercial-input");
  }

  if (input.canCreateSale && input.stage === "READY_FOR_SALE") {
    actions.push("create-sale");
  }

  if (input.canReviewLead && input.stage === "PENDING_EXTERNAL_REVIEW") {
    actions.push("review-lead");
  }

  if (input.canCreateQuotation && input.stage === "READY_FOR_QUOTATION") {
    actions.push("create-quotation");
  }

  if (input.canApproveForSale && input.stage === "QUOTED") {
    actions.push("approve-for-sale");
  }

  if (input.canReassignLead) {
    actions.push("reassign-lead");
  }

  return actions;
}
