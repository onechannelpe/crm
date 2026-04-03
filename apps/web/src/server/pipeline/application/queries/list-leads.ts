import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import {
  parseLeadPriority,
  parseLeadStage,
  parseLeadStatus,
} from "../../domain/lead";
import {
  requireLeadReadAccess,
  resolveLeadListExecutiveScope,
} from "../policies/access";
import type { LeadRepository } from "../ports/lead-repository";
import { parsePageParams } from "./pagination";

type ListLeadsDeps = {
  leads: LeadRepository;
};

export async function listLeads(
  deps: ListLeadsDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    filters: {
      stage?: string;
      status?: string;
      prioridad?: string;
      executiveId?: number;
      limit?: number;
      offset?: number;
    };
  },
): Promise<
  Result<
    {
      rows: Awaited<ReturnType<LeadRepository["list"]>>;
      totalCount: number;
    },
    DomainError
  >
> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  const stage = parseLeadStage(input.filters.stage);
  if (!stage.ok) {
    return stage;
  }

  const status = parseLeadStatus(input.filters.status);
  if (!status.ok) {
    return status;
  }

  const prioridad = parseLeadPriority(input.filters.prioridad);
  if (!prioridad.ok) {
    return prioridad;
  }

  const page = parsePageParams(input.filters);
  if (!page.ok) {
    return page;
  }

  const filters = {
    executiveId: resolveLeadListExecutiveScope({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestedExecutiveId: input.filters.executiveId,
    }),
    stage: stage.value,
    status: status.value,
    prioridad: prioridad.value,
    limit: page.value.limit,
    offset: page.value.offset,
  };

  const [rows, totalCount] = await Promise.all([
    deps.leads.list(filters),
    deps.leads.count(filters),
  ]);

  return Ok({ rows, totalCount });
}
