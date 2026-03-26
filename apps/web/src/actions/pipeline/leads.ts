"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { forbiddenError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { requireAuth, requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { getLeadDetailQuery } from "~/server/leads/application/get-lead-detail";
import { listLeadsQuery } from "~/server/leads/application/list-leads";
import { registerLeadUseCase } from "~/server/leads/application/register-lead";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";
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

      const result = await registerLeadUseCase({
        ruc: input.ruc.trim(),
        razonSocial: input.razonSocial,
        address: input.address,
        executiveId: effectiveExecutiveId,
        actorId: session.userId,
      });

      if (isErr(result)) throwDomainError(result.error);
      return result.value;
    },
  });
}

export interface ListLeadsFilters {
  stage?: string;
  status?: string;
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

      return listLeadsQuery({
        actorRole: session.role,
        actorUserId: session.userId,
        stage: filters.stage,
        status: filters.status,
        prioridad: filters.prioridad,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        executiveId: filters.executiveId,
        limit: filters.limit,
        offset: filters.offset,
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
      const session = await requireAuth();
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await getLeadDetailQuery({
        leadId,
        actorUserId: session.userId,
        actorRole: session.role,
      });
      if (isErr(result)) throwDomainError(result.error);
      return result.value;
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

      const lead = await pipelineRepos.leads.findByRuc(ruc.trim());
      if (!lead) return null;

      const canViewAll = hasPermission(session.role, "lead:view:all");
      if (!canViewAll && lead.executive_id !== session.userId) {
        throw forbiddenError("Access denied");
      }

      return lead;
    },
  });
}
