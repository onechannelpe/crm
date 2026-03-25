"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import {
  forbiddenError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { toEstado, toLeadStage, toPrioridad } from "~/lib/db/types";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { leadWorkflowService, repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export interface RegisterLeadInput {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
}

export async function registerLead(
  input: RegisterLeadInput,
): Promise<{ id: number }> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.register",
    actor,
    input: { ruc: input.ruc },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!input.ruc || typeof input.ruc !== "string") {
        throw validationError("ruc is required");
      }

      // Executive can only register for themselves unless admin
      const effectiveExecutiveId =
        session.role === "admin" || session.role === "superuser"
          ? input.executiveId
          : session.userId;

      const result = await leadWorkflowService.registerLead({
        ruc: input.ruc.trim(),
        razonSocial: input.razonSocial,
        address: input.address,
        executiveId: effectiveExecutiveId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
      return { id: result.value };
    },
  });
}

export interface ListLeadsFilters {
  stage?: string;
  estado?: string;
  prioridad?: string;
  fromDate?: number;
  toDate?: number;
  executiveId?: number;
  limit?: number;
  offset?: number;
}

export async function listLeads(filters: ListLeadsFilters) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.list",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      const canViewAll = hasPermission(session.role, "lead:view:all");

      return repos.leads.list({
        executiveId: canViewAll ? filters.executiveId : session.userId,
        stage: toLeadStage(filters.stage),
        estado: toEstado(filters.estado),
        prioridad: toPrioridad(filters.prioridad),
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        limit: Math.min(filters.limit ?? 50, 200),
        offset: filters.offset ?? 0,
      });
    },
  });
}

export async function getLead(leadId: number) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.get",
    actor,
    input: { leadId },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      const lead = await repos.leads.findById(leadId);
      if (!lead) throw notFoundError("Lead not found");

      const canViewAll = hasPermission(session.role, "lead:view:all");
      if (!canViewAll && lead.executive_id !== session.userId) {
        throw forbiddenError("Access denied");
      }

      const [commercialInput, quotations] = await Promise.all([
        repos.leadCommercialInputs.findByLeadId(leadId),
        repos.quotations.listByLead(leadId),
      ]);

      return { lead, commercialInput, quotations };
    },
  });
}

export async function searchLeadByRuc(ruc: string) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.search_by_ruc",
    actor,
    input: { ruc },
    run: async () => {
      const session = await requirePermission("lead:register");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!ruc || typeof ruc !== "string")
        throw validationError("ruc is required");

      const lead = await repos.leads.findByRuc(ruc.trim());
      if (!lead) return null;

      const canViewAll = hasPermission(session.role, "lead:view:all");
      if (!canViewAll && lead.executive_id !== session.userId) {
        throw forbiddenError("Access denied");
      }

      return lead;
    },
  });
}
