import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadListView, ListLeadsInput } from "~/server/workflow/types";

import { resolveLeadNextStep } from "../../domain/lead-progress";
import {
  requireCapability,
  resolveLeadListExecutiveScope,
} from "../../domain/lead/policy";
import type { LeadListFilters, LeadQueries } from "../ports/lead";
import { parsePageParams } from "./pagination";

type LeadSortField = "createdAt" | "updatedAt" | "registeredBy" | "ruc";
type LeadSortDirection = "asc" | "desc";

type LeadListQueryDeps = {
  leads: LeadQueries;
};

function normalizeLeadAnyFieldSearch(value: string | undefined) {
  return value?.trim().toLowerCase() || undefined;
}

export async function listLeads(
  deps: LeadListQueryDeps,
  input: {
    actorUserId: number;
    actorRole: ListLeadsInput["actor"]["role"];
    actorBranchId: number;
    filters: ListLeadsInput["filters"];
  },
): Promise<Result<LeadListView, DomainError>> {
  const canRead = requireCapability("view", { role: input.actorRole });
  if (!canRead.ok) {
    return canRead;
  }

  const page = parsePageParams(input.filters);
  if (!page.ok) {
    return page;
  }

  const sortBy: LeadSortField = input.filters.sortBy ?? "createdAt";
  const sortDirection: LeadSortDirection =
    input.filters.sortDirection ?? "desc";

  const filters: LeadListFilters = {
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    actorBranchId: input.actorBranchId,
    executiveId: resolveLeadListExecutiveScope({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestedExecutiveId: input.filters.executiveId,
    }),
    stage: input.filters.stage,
    status: input.filters.status,
    prioridad: input.filters.prioridad,
    anyFieldSearch: normalizeLeadAnyFieldSearch(input.filters.anyFieldSearch),
    updatedSinceMs: input.filters.updatedSinceMs,
    updatedUntilMs: input.filters.updatedUntilMs,
    sortBy,
    sortDirection,
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
        nextStep: resolveLeadNextStep(row),
      }),
    ),
    totalCount,
  });
}
