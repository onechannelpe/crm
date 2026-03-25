import type { Estado, Prioridad } from "~/lib/db/types";
import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import { canTransition, evaluatePendingTransition } from "./transitions";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

async function applyPendingTransition(
  leadId: number,
  actorId: number,
  repos: Repositories,
  audit: ReturnType<typeof createAuditService>,
): Promise<void> {
  const lead = await repos.leads.findById(leadId);
  if (!lead) return;
  const next = evaluatePendingTransition(
    lead.stage,
    lead.estado,
    lead.prioridad,
  );
  if (!next || !canTransition(lead.stage, next)) return;
  await repos.leads.updateStage(leadId, next);
  await audit.log(actorId, "stage_changed", "crm_lead", leadId, {
    from: lead.stage,
    to: next,
  });
}

export function createLeadWorkflowService(
  repos: Repositories,
  runInTransaction: <T>(op: (r: Repositories) => Promise<T>) => Promise<T>,
) {
  const audit = createAuditService(repos);

  return {
    async registerLead(input: {
      ruc: string;
      razonSocial: string | null;
      address: string | null;
      executiveId: number;
      actorId: number;
    }): Promise<Result<number, DomainError>> {
      if (!/^\d+$/.test(input.ruc)) {
        return fail("invalid_ruc", "RUC must be a numeric string");
      }
      const existing = await repos.leads.findByRuc(input.ruc);
      if (existing)
        return fail("ruc_conflict", "A lead with this RUC already exists");

      const now = Date.now();
      return runInTransaction(async (tx) => {
        const leadId = await tx.leads.create({
          ruc: input.ruc,
          razon_social: input.razonSocial,
          address: input.address,
          executive_id: input.executiveId,
          stage: "REGISTERED",
          estado: null,
          prioridad: null,
          created_at: now,
          updated_at: now,
        });
        await tx.pipelineAssignments.create({
          lead_id: leadId,
          executive_id: input.executiveId,
          assigned_by: input.actorId,
          is_active: 1,
          assigned_at: now,
        });
        // Auto-advance system stages synchronously
        await tx.leads.updateStage(leadId, "ENRICHING");
        await tx.leads.updateStage(leadId, "PENDING_EXTERNAL_REVIEW");
        await audit.log(input.actorId, "lead_created", "crm_lead", leadId, {
          ruc: input.ruc,
          stage: "PENDING_EXTERNAL_REVIEW",
        });
        return Ok(leadId);
      });
    },

    async updateEstado(input: {
      leadId: number;
      estado: Estado;
      reason: string;
      actorId: number;
    }): Promise<Result<void, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );

      return runInTransaction(async (tx) => {
        await tx.leads.updateEstado(input.leadId, input.estado);
        await audit.log(
          input.actorId,
          "estado_changed",
          "crm_lead",
          input.leadId,
          {
            from: lead.estado,
            to: input.estado,
            reason: input.reason,
          },
        );
        await applyPendingTransition(input.leadId, input.actorId, tx, audit);
        return Ok(undefined);
      });
    },

    async updatePrioridad(input: {
      leadId: number;
      prioridad: Prioridad;
      reason: string;
      actorId: number;
    }): Promise<Result<void, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );

      return runInTransaction(async (tx) => {
        await tx.leads.updatePrioridad(input.leadId, input.prioridad);
        await audit.log(
          input.actorId,
          "prioridad_changed",
          "crm_lead",
          input.leadId,
          {
            from: lead.prioridad,
            to: input.prioridad,
            reason: input.reason,
          },
        );
        await applyPendingTransition(input.leadId, input.actorId, tx, audit);
        return Ok(undefined);
      });
    },

    async completeExecutiveInput(input: {
      leadId: number;
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
      actorId: number;
    }): Promise<Result<void, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      if (lead.stage !== "NEEDS_EXECUTIVE_INPUT") {
        return fail("invalid_stage", "Lead is not awaiting executive input");
      }
      if (lead.executive_id !== input.actorId) {
        return Err(
          domainError(
            "forbidden",
            "not_owner",
            "Only the assigned executive can complete input",
          ),
        );
      }

      return runInTransaction(async (tx) => {
        await tx.leadCommercialInputs.upsert({
          lead_id: input.leadId,
          proveedor_actual: input.proveedorActual,
          tasa_actual: input.tasaActual,
          gpv: input.gpv,
          ticket: input.ticket,
          abono: input.abono,
          cantidad_pos: input.cantidadPos,
          updated_at: Date.now(),
          updated_by: input.actorId,
        });
        await tx.leads.updateStage(input.leadId, "READY_FOR_QUOTATION");
        await audit.log(
          input.actorId,
          "stage_changed",
          "crm_lead",
          input.leadId,
          {
            from: lead.stage,
            to: "READY_FOR_QUOTATION",
          },
        );
        return Ok(undefined);
      });
    },

    async reassignLead(input: {
      leadId: number;
      newExecutiveId: number;
      actorId: number;
    }): Promise<Result<void, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );

      const newExec = await repos.users.findById(input.newExecutiveId);
      if (!newExec || !newExec.is_active) {
        return fail(
          "invalid_executive",
          "Target executive not found or inactive",
        );
      }

      return runInTransaction(async (tx) => {
        await tx.pipelineAssignments.deactivateForLead(input.leadId);
        await tx.pipelineAssignments.create({
          lead_id: input.leadId,
          executive_id: input.newExecutiveId,
          assigned_by: input.actorId,
          is_active: 1,
          assigned_at: Date.now(),
        });
        await tx.leads.updateExecutiveId(input.leadId, input.newExecutiveId);
        await audit.log(
          input.actorId,
          "lead_reassigned",
          "crm_lead",
          input.leadId,
          {
            from: lead.executive_id,
            to: input.newExecutiveId,
          },
        );
        return Ok(undefined);
      });
    },

    async approveForSale(input: {
      leadId: number;
      actorId: number;
    }): Promise<Result<void, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      if (!canTransition(lead.stage, "READY_FOR_SALE")) {
        return fail("invalid_stage", "Lead must be QUOTED to approve for sale");
      }
      await repos.leads.updateStage(input.leadId, "READY_FOR_SALE");
      await audit.log(
        input.actorId,
        "stage_changed",
        "crm_lead",
        input.leadId,
        {
          from: lead.stage,
          to: "READY_FOR_SALE",
        },
      );
      return Ok(undefined);
    },

    async createSale(input: {
      leadId: number;
      executiveId: number;
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
      banco: string;
      nroCuenta: string;
      cci: string | null;
    }): Promise<Result<number, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      if (lead.stage !== "READY_FOR_SALE") {
        return fail(
          "invalid_stage",
          "Lead must be READY_FOR_SALE to create a sale",
        );
      }
      if (lead.executive_id !== input.executiveId) {
        return Err(
          domainError(
            "forbidden",
            "not_owner",
            "Only the assigned executive can create a sale",
          ),
        );
      }
      if (input.banco.toUpperCase() !== "BCP" && !input.cci) {
        return fail(
          "cci_required",
          "CCI is required for non-BCP bank accounts",
        );
      }

      return runInTransaction(async (tx) => {
        const saleId = await tx.leadSales.create({
          lead_id: input.leadId,
          executive_id: input.executiveId,
          proveedor_actual: input.proveedorActual,
          tasa_actual: input.tasaActual,
          gpv: input.gpv,
          ticket: input.ticket,
          abono: input.abono,
          cantidad_pos: input.cantidadPos,
          banco: input.banco,
          nro_cuenta: input.nroCuenta,
          cci: input.cci,
          created_at: Date.now(),
        });
        await tx.leads.updateStage(input.leadId, "CONVERTED");
        await audit.log(
          input.executiveId,
          "sale_created",
          "crm_lead",
          input.leadId,
          {
            saleId,
            to: "CONVERTED",
          },
        );
        return Ok(saleId);
      });
    },

    async createQuotation(input: {
      leadId: number;
      paybackPricing: number;
      tarifaDebito: number;
      tarifaCredito: number;
      tarifaForaneo: number;
      fee: number;
      moneda: "PEN" | "USD";
      actorId: number;
    }): Promise<Result<number, DomainError>> {
      const lead = await repos.leads.findById(input.leadId);
      if (!lead)
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      if (lead.stage !== "READY_FOR_QUOTATION") {
        return fail(
          "invalid_stage",
          "Lead must be READY_FOR_QUOTATION to create a quotation",
        );
      }

      return runInTransaction(async (tx) => {
        const version = await tx.quotations.nextVersion(input.leadId);
        const quotationId = await tx.quotations.create({
          lead_id: input.leadId,
          payback_pricing: input.paybackPricing,
          tarifa_debito: input.tarifaDebito,
          tarifa_credito: input.tarifaCredito,
          tarifa_foraneo: input.tarifaForaneo,
          fee: input.fee,
          moneda: input.moneda,
          version,
          created_at: Date.now(),
          created_by: input.actorId,
        });
        await tx.leads.updateStage(input.leadId, "QUOTED");
        await audit.log(
          input.actorId,
          "quotation_created",
          "crm_lead",
          input.leadId,
          {
            quotationId,
            version,
            to: "QUOTED",
          },
        );
        return Ok(quotationId);
      });
    },
  };
}
