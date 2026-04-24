import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

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

const LEAD_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "registeredBy",
  "ruc",
] as const;
type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];
const LEAD_SORT_DIRECTIONS = ["asc", "desc"] as const;
type LeadSortDirection = (typeof LEAD_SORT_DIRECTIONS)[number];

function parseLeadSortField(
  value: string | undefined,
): Result<LeadSortField, DomainError> {
  if (value === undefined) {
    return Ok("createdAt");
  }

  const parsed = LEAD_SORT_FIELDS.find((option) => option === value);
  if (!parsed) {
    return Err(
      domainError(
        "validation",
        "invalid_sort_by",
        "Invalid sort field",
      ),
    );
  }

  return Ok(parsed);
}

function parseLeadSortDirection(
  value: string | undefined,
): Result<LeadSortDirection, DomainError> {
  if (value === undefined) {
    return Ok("desc");
  }

  const parsed = LEAD_SORT_DIRECTIONS.find((option) => option === value);
  if (!parsed) {
    return Err(
      domainError(
        "validation",
        "invalid_sort_direction",
        "Invalid sort direction",
      ),
    );
  }

  return Ok(parsed);
}

export async function listLeads(
  deps: LeadListDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    filters: {
      stage?: string;
      status?: string;
      prioridad?: string;
      executiveId?: number;
      updatedSinceMs?: number;
      updatedUntilMs?: number;
      sortBy?: string;
      sortDirection?: string;
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

  const sortBy = parseLeadSortField(input.filters.sortBy);
  if (!sortBy.ok) {
    return sortBy;
  }

  const sortDirection = parseLeadSortDirection(input.filters.sortDirection);
  if (!sortDirection.ok) {
    return sortDirection;
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
    updatedSinceMs: input.filters.updatedSinceMs,
    updatedUntilMs: input.filters.updatedUntilMs,
    sortBy: sortBy.value,
    sortDirection: sortDirection.value,
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
