import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import {
  parseLeadPriority,
  parseLeadStage,
  parseLeadStatus,
} from "../../domain/lead-schema-parser";
import type { LeadListDeps } from "../deps/lead-queries";
import {
  requireLeadReadAccess,
  resolveLeadListExecutiveScope,
} from "../policies/access";
import { presentLeadNextStep } from "../presenters/lead-progress";
import { parsePageParams } from "./pagination";
import type { LeadListView } from "./views/lead-list";

export async function listLeads(
  deps: LeadListDeps,
  input: {
    actorUserId: UserId;
    actorRole: Role;
    filters: {
      stage?: string;
      status?: string;
      prioridad?: string;
      executiveId?: UserId;
      limit?: number;
      offset?: number;
    };
  },
): Promise<Result<LeadListView, DomainError>> {
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

  return Ok({
    rows: rows.map((row) =>
      Object.assign({}, row, {
        nextStep: presentLeadNextStep({ lead: row, sale: undefined }),
      }),
    ),
    totalCount,
  });
}
