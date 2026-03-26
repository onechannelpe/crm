import type { Insertable, Selectable } from "kysely";

import type {
  Database,
  PipelineLeadCommercialInputsTable,
  LeadStage,
  LeadStatus,
  Prioridad,
} from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadDomainEvent } from "./lead-events";
import {
  canTransitionLeadStage,
  resolvePendingReviewStage,
} from "./lead-stage-policy";

export type LeadState = Selectable<Database["pipeline_leads"]>;
export type LeadCommercialInputWrite =
  Insertable<PipelineLeadCommercialInputsTable>;

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function buildRegisteredLead(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  actorId: number;
  now: number;
}): Result<
  {
    lead: Insertable<Database["pipeline_leads"]>;
    event: LeadDomainEvent;
  },
  DomainError
> {
  if (!/^\d+$/.test(input.ruc)) {
    return fail("invalid_ruc", "RUC must be a numeric string");
  }

  return Ok({
    lead: {
      ruc: input.ruc,
      razon_social: input.razonSocial,
      address: input.address,
      executive_id: input.executiveId,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
      created_at: input.now,
      updated_at: input.now,
    },
    event: {
      type: "lead_registered",
      leadId: 0,
      actorId: input.actorId,
      ruc: input.ruc,
      toStage: "PENDING_EXTERNAL_REVIEW",
    },
  });
}

export function applyStatusReview(input: {
  lead: LeadState;
  status: LeadStatus;
  actorId: number;
  branchId: number;
}): Result<
  {
    nextStage: LeadStage | null;
    events: LeadDomainEvent[];
  },
  DomainError
> {
  const nextStage = resolvePendingReviewStage({
    stage: input.lead.stage,
    status: input.status,
    prioridad: input.lead.prioridad,
  });

  if (nextStage && !canTransitionLeadStage(input.lead.stage, nextStage)) {
    return fail("invalid_stage_transition", "Lead cannot transition");
  }

  const events: LeadDomainEvent[] = [];
  if (nextStage === "NEEDS_EXECUTIVE_INPUT") {
    events.push({
      type: "lead_needs_executive_input",
      leadId: input.lead.id,
      executiveId: input.lead.executive_id,
      ruc: input.lead.ruc,
    });
  }
  if (nextStage === "READY_FOR_QUOTATION") {
    events.push({
      type: "lead_ready_for_quotation",
      leadId: input.lead.id,
      branchId: input.branchId,
      ruc: input.lead.ruc,
    });
  }

  return Ok({ nextStage, events });
}

export function applyPrioridadReview(input: {
  lead: LeadState;
  prioridad: Prioridad;
  branchId: number;
}): Result<
  {
    nextStage: LeadStage | null;
    events: LeadDomainEvent[];
  },
  DomainError
> {
  const nextStage = resolvePendingReviewStage({
    stage: input.lead.stage,
    status: input.lead.status,
    prioridad: input.prioridad,
  });

  if (nextStage && !canTransitionLeadStage(input.lead.stage, nextStage)) {
    return fail("invalid_stage_transition", "Lead cannot transition");
  }

  const events: LeadDomainEvent[] = [];
  if (nextStage === "NEEDS_EXECUTIVE_INPUT") {
    events.push({
      type: "lead_needs_executive_input",
      leadId: input.lead.id,
      executiveId: input.lead.executive_id,
      ruc: input.lead.ruc,
    });
  }
  if (nextStage === "READY_FOR_QUOTATION") {
    events.push({
      type: "lead_ready_for_quotation",
      leadId: input.lead.id,
      branchId: input.branchId,
      ruc: input.lead.ruc,
    });
  }

  return Ok({ nextStage, events });
}

export function completeCommercialInput(input: {
  lead: LeadState;
  actorId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  now: number;
  branchId: number;
}): Result<
  {
    commercialInput: LeadCommercialInputWrite;
    events: LeadDomainEvent[];
  },
  DomainError
> {
  if (input.lead.stage !== "NEEDS_EXECUTIVE_INPUT") {
    return fail("invalid_stage", "Lead is not awaiting executive input");
  }
  if (input.lead.executive_id !== input.actorId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can complete input",
      ),
    );
  }

  return Ok({
    commercialInput: {
      lead_id: input.lead.id,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      updated_at: input.now,
      updated_by: input.actorId,
    },
    events: [
      {
        type: "lead_ready_for_quotation",
        leadId: input.lead.id,
        branchId: input.branchId,
        ruc: input.lead.ruc,
      },
    ],
  });
}

export function ensureLeadCanBeReassigned(input: {
  lead: LeadState;
  newExecutiveId: number;
}): Result<void, DomainError> {
  if (input.lead.executive_id === input.newExecutiveId) {
    return fail(
      "same_executive",
      "Lead is already assigned to the selected executive",
    );
  }
  return Ok(undefined);
}

export function ensureLeadCanCreateQuotation(
  lead: LeadState,
): Result<void, DomainError> {
  if (lead.stage !== "READY_FOR_QUOTATION") {
    return fail(
      "invalid_stage",
      "Lead must be READY_FOR_QUOTATION to create a quotation",
    );
  }
  return Ok(undefined);
}

export function ensureLeadCanApproveForSale(
  lead: LeadState,
): Result<LeadDomainEvent[], DomainError> {
  if (!canTransitionLeadStage(lead.stage, "READY_FOR_SALE")) {
    return fail("invalid_stage", "Lead must be QUOTED to approve for sale");
  }
  return Ok([
    {
      type: "lead_ready_for_sale",
      leadId: lead.id,
      executiveId: lead.executive_id,
      ruc: lead.ruc,
    },
  ]);
}

export function ensureLeadCanCreateSale(input: {
  lead: LeadState;
  executiveId: number;
  banco: string;
  cci: string | null;
}): Result<void, DomainError> {
  if (input.lead.stage !== "READY_FOR_SALE") {
    return fail(
      "invalid_stage",
      "Lead must be READY_FOR_SALE to create a sale",
    );
  }
  if (input.lead.executive_id !== input.executiveId) {
    return Err(
      domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create a sale",
      ),
    );
  }
  if (input.banco.toUpperCase() !== "BCP" && !input.cci) {
    return fail("cci_required", "CCI is required for non-BCP bank accounts");
  }
  return Ok(undefined);
}
