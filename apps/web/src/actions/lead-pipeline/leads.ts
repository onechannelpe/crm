"use server";

import { validationError } from "~/lib/app-errors";
import {
  LEAD_STATUS_VALUES,
  PRIORIDAD_VALUES,
  type LeadCallOutcome,
} from "~/lib/db/types";
import {
  approveLeadForSale as approveLeadForSaleUseCase,
  completeExecutiveInput as completeExecutiveInputUseCase,
  createLead as createLeadUseCase,
  createQuotation as createQuotationUseCase,
  createSale as createSaleUseCase,
  getLeadDetail as getLeadDetailUseCase,
  getSaleDetail as getSaleDetailUseCase,
  listLeads as listLeadsUseCase,
  listSales as listSalesUseCase,
  logLeadInteraction as logLeadInteractionUseCase,
  reassignLead as reassignLeadUseCase,
  reviewLead as reviewLeadUseCase,
} from "~/server/lead-pipeline/application/leads";
import { runAction } from "~/server/shared/action-runtime";

export async function createLead(input: { ruc: string; executiveId?: number }) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "lead_pipeline.create_lead",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      createLeadUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: input.executiveId ?? ctx.actor.userId,
        ruc: input.ruc,
      }),
  });
}

export async function listLeads(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "lead_pipeline.list_leads",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listLeadsUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function getLeadDetail(leadId: number) {
  return runAction({
    actionName: "lead_pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetailUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}

export async function reviewLead(input: {
  leadId: number;
  status: string;
  prioridad: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw validationError("reason is required");
  }

  const status = LEAD_STATUS_VALUES.find((value) => value === input.status);
  if (!status) {
    throw validationError("invalid status");
  }

  const prioridad = PRIORIDAD_VALUES.find((value) => value === input.prioridad);
  if (!prioridad) {
    throw validationError("invalid prioridad");
  }

  return runAction({
    actionName: "lead_pipeline.review_lead",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLeadUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: ctx.actor.branchId,
        leadId: input.leadId,
        status,
        prioridad,
        reason: input.reason,
      }),
  });
}

export async function completeExecutiveInput(input: {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }

  return runAction({
    actionName: "lead_pipeline.complete_executive_input",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      completeExecutiveInputUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: ctx.actor.branchId,
        ...input,
      }),
  });
}

export async function createQuotation(input: {
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
}) {
  return runAction({
    actionName: "lead_pipeline.create_quotation",
    permission: "quotation:manage",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createQuotationUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}

export async function approveLeadForSale(leadId: number) {
  return runAction({
    actionName: "lead_pipeline.approve_for_sale",
    permission: "quotation:manage",
    input: { leadId },
    execute: (ctx) =>
      approveLeadForSaleUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}

export async function createSale(input: {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.banco?.trim()) {
    throw validationError("banco is required");
  }
  if (!input.nroCuenta?.trim()) {
    throw validationError("nroCuenta is required");
  }

  return runAction({
    actionName: "lead_pipeline.create_sale",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      createSaleUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}

export async function reassignLead(input: {
  leadId: number;
  newExecutiveId: number;
}) {
  return runAction({
    actionName: "lead_pipeline.reassign_lead",
    permission: "lead:reassign",
    input,
    execute: (ctx) =>
      reassignLeadUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}

export async function logLeadCall(input: {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
}) {
  return runAction({
    actionName: "lead_pipeline.log_call",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteractionUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "call",
        outcome: input.outcome,
        bodyText: input.notes ?? null,
      }),
  });
}

export async function listSales(filters: { limit?: number; offset?: number }) {
  return runAction({
    actionName: "lead_pipeline.list_sales",
    permission: "lead:register",
    input: filters,
    execute: (ctx) =>
      listSalesUseCase({
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        ...filters,
      }),
  });
}

export async function getSaleDetail(saleId: number) {
  return runAction({
    actionName: "lead_pipeline.get_sale_detail",
    permission: "lead:register",
    input: { saleId },
    execute: (ctx) =>
      getSaleDetailUseCase({
        actorRole: ctx.actor.role,
        actorUserId: ctx.actor.userId,
        saleId,
      }),
  });
}

export async function addLeadNote(input: { leadId: number; body: string }) {
  if (!input.body.trim()) {
    throw validationError("body is required");
  }

  return runAction({
    actionName: "lead_pipeline.add_note",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      logLeadInteractionUseCase({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId: input.leadId,
        kind: "note",
        bodyText: input.body,
      }),
  });
}
