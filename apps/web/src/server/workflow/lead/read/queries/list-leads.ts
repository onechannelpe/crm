import type { LeadListView } from "~/contracts/workflow/views";
import type { DomainError } from "~/domain/errors";
import type { BranchId, UserId } from "~/domain/ids";
import { appCalendarDateAt, appDayRange } from "~/domain/time/app-time";
import {
  requireCapability,
  resolveLeadListExecutiveScope,
} from "~/server/workflow/lead/domain/policy";
import { resolveLeadNextStep } from "~/server/workflow/lead/read/lead-progress";
import type {
  LeadListFilters,
  LeadQueries,
} from "~/server/workflow/lead/read/lead-queries";
import { Ok, type Result } from "~/shared/result";

import type { ListLeadsInput } from "../inputs";
import { parsePageParams } from "./pagination";

type LeadSortField = "createdAt" | "updatedAt" | "registeredBy" | "ruc";
type LeadSortDirection = "asc" | "desc";

type LeadListQueryDeps = {
  leads: LeadQueries;
};

function normalizeLeadAnyFieldSearch(value: string | undefined) {
  return value?.trim() || undefined;
}

export async function listLeads(
  deps: LeadListQueryDeps,
  input: {
    actorUserId: UserId;
    actorRole: ListLeadsInput["actor"]["role"];
    actorBranchId: BranchId;
    filters: ListLeadsInput["filters"];
    evaluatedAt: Date;
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

  const updatedRange = input.filters.updatedToday
    ? appDayRange(appCalendarDateAt(input.evaluatedAt))
    : undefined;
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
    priority: input.filters.priority,
    anyFieldSearch: normalizeLeadAnyFieldSearch(input.filters.anyFieldSearch),
    updatedSince: updatedRange?.start,
    updatedUntil: updatedRange?.endExclusive,
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
