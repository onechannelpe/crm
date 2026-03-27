"use server";

import { forbiddenError, validationError } from "~/lib/app-errors";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getLeadDetailQuery } from "~/server/leads/application/get-lead-detail";
import { listLeadsQuery } from "~/server/leads/application/list-leads";
import { registerLeadUseCase } from "~/server/leads/application/register-lead";
import { runAction } from "~/server/shared/action-runtime";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";
import { Ok } from "~/server/shared/result";

export interface RegisterLeadInput {
  ruc: string;
  executiveId: number;
}

export async function registerLead(
  input: RegisterLeadInput,
): Promise<{ id: number }> {
  if (!input.ruc || typeof input.ruc !== "string") {
    throw validationError("ruc is required");
  }
  return runAction({
    actionName: "lead.register",
    permission: "lead:pipeline",
    input: { ruc: input.ruc },
    execute: async (ctx) => {
      const effectiveExecutiveId =
        ctx.actor.role === "admin" || ctx.actor.role === "superuser"
          ? input.executiveId
          : ctx.actor.userId;
      return registerLeadUseCase({
        ruc: input.ruc.trim(),
        executiveId: effectiveExecutiveId,
        actorId: ctx.actor.userId,
      });
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
  return runAction({
    actionName: "lead.list",
    permission: "lead:pipeline",
    input: {},
    execute: async (ctx) =>
      Ok(
        await listLeadsQuery({
          actorRole: ctx.actor.role,
          actorUserId: ctx.actor.userId,
          stage: filters.stage,
          status: filters.status,
          prioridad: filters.prioridad,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          executiveId: filters.executiveId,
          limit: filters.limit,
          offset: filters.offset,
        }),
      ),
  });
}

export async function getLead(leadId: number) {
  return runAction({
    actionName: "lead.get",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetailQuery({
        leadId,
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
      }),
  });
}

export async function searchLeadByRuc(ruc: string) {
  if (!ruc || typeof ruc !== "string") {
    throw validationError("ruc is required");
  }
  return runAction({
    actionName: "lead.search_by_ruc",
    permission: "lead:pipeline",
    input: { ruc },
    execute: async (ctx) => {
      const lead = await pipelineRepos.leads.findByRuc(ruc.trim());
      if (!lead) return Ok(null);

      const canViewAll = hasPermission(ctx.actor.role, "lead:view:all");
      if (!canViewAll && lead.executive_id !== ctx.actor.userId) {
        throw forbiddenError("Access denied");
      }

      return Ok(lead);
    },
  });
}
