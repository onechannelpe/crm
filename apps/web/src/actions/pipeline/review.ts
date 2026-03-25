"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { ESTADO_VALUES, PRIORIDAD_VALUES, toLeadStage } from "~/lib/db/types";
import type { Estado, Prioridad } from "~/lib/db/types";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import {
  appNotificationCenter,
  leadWorkflowService,
  repos,
} from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

function isEstado(v: string): v is Estado {
  return (ESTADO_VALUES as readonly string[]).includes(v);
}

function isPrioridad(v: string): v is Prioridad {
  return (PRIORIDAD_VALUES as readonly string[]).includes(v);
}

export async function updateLeadEstado(input: {
  leadId: number;
  estado: string;
  reason: string;
}): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.update_estado",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!isEstado(input.estado))
        throw validationError("Invalid estado value");
      if (!input.reason?.trim()) throw validationError("reason is required");

      const result = await leadWorkflowService.updateEstado({
        leadId: input.leadId,
        estado: input.estado,
        reason: input.reason,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);

      // Check if stage advanced to NEEDS_EXECUTIVE_INPUT or READY_FOR_QUOTATION
      const lead = await repos.leads.findById(input.leadId);
      if (!lead) return;

      if (lead.stage === "NEEDS_EXECUTIVE_INPUT") {
        await appNotificationCenter.notifyUsers([lead.executive_id], {
          type: "lead.needs_executive_input",
          title: "Accion requerida",
          bodyText: `El lead RUC ${lead.ruc} requiere tu informacion comercial`,
          actionUrl: `/leads/${lead.id}/complete`,
          priority: "high",
          dedupeKey: `lead_nei_${lead.id}`,
        });
      } else if (lead.stage === "READY_FOR_QUOTATION") {
        await appNotificationCenter.notifyBranchRoles(
          session.branchId,
          ["back_office"],
          {
            type: "lead.ready_for_quotation",
            title: "Lead listo para cotizacion",
            bodyText: `El lead RUC ${lead.ruc} esta listo para cotizar`,
            actionUrl: `/quotations/${lead.id}`,
            priority: "normal",
            dedupeKey: `lead_rfq_${lead.id}`,
          },
        );
      }
    },
  });
}

export async function updateLeadPrioridad(input: {
  leadId: number;
  prioridad: string;
  reason: string;
}): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.update_prioridad",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!isPrioridad(input.prioridad))
        throw validationError("Invalid prioridad value");
      if (!input.reason?.trim()) throw validationError("reason is required");

      const result = await leadWorkflowService.updatePrioridad({
        leadId: input.leadId,
        prioridad: input.prioridad,
        reason: input.reason,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);

      const lead = await repos.leads.findById(input.leadId);
      if (!lead) return;

      if (lead.stage === "NEEDS_EXECUTIVE_INPUT") {
        await appNotificationCenter.notifyUsers([lead.executive_id], {
          type: "lead.needs_executive_input",
          title: "Accion requerida",
          bodyText: `El lead RUC ${lead.ruc} requiere tu informacion comercial`,
          actionUrl: `/leads/${lead.id}/complete`,
          priority: "high",
          dedupeKey: `lead_nei_${lead.id}`,
        });
      } else if (lead.stage === "READY_FOR_QUOTATION") {
        await appNotificationCenter.notifyBranchRoles(
          session.branchId,
          ["back_office"],
          {
            type: "lead.ready_for_quotation",
            title: "Lead listo para cotizacion",
            bodyText: `El lead RUC ${lead.ruc} esta listo para cotizar`,
            actionUrl: `/quotations/${lead.id}`,
            priority: "normal",
            dedupeKey: `lead_rfq_${lead.id}`,
          },
        );
      }
    },
  });
}

export async function listLeadsForReview(filters: {
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.list_review",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      return repos.leads.list({
        stage: toLeadStage(filters.stage),
        limit: Math.min(filters.limit ?? 50, 200),
        offset: filters.offset ?? 0,
      });
    },
  });
}
