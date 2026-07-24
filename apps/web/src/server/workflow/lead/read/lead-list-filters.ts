import type { SelectQueryBuilder } from "kysely";

import type { LeadListFilters, RecordExportFilters } from "./lead-queries";
import type { LeadQueryDatabase } from "./lead-query-types";

type VisibilityQuery = SelectQueryBuilder<
  LeadQueryDatabase,
  "lead" | "executive",
  any
>;

type LeadListQuery = SelectQueryBuilder<
  LeadQueryDatabase,
  "lead" | "executive" | "creator" | "org",
  any
>;

export function applyLeadVisibility(
  query: VisibilityQuery,
  filters: LeadListFilters | RecordExportFilters,
): VisibilityQuery {
  query = query.where("lead.deleted_at", "is", null);

  if (filters.actorRole === "superuser") {
    return query;
  }

  if (filters.actorRole === "supervisor") {
    return query.where("executive.branch_id", "in", (eb) =>
      eb
        .selectFrom("branch_supervisors")
        .select("branch_id")
        .where("user_id", "=", filters.actorUserId),
    );
  }

  if (filters.actorRole === "back_office") {
    return query.where("executive.team_id", "in", (eb) =>
      eb
        .selectFrom("back_office_assignments")
        .select("team_id")
        .where("back_office_user_id", "=", filters.actorUserId),
    );
  }

  if (filters.actorRole === "executive") {
    return query.where("lead.executive_id", "=", filters.actorUserId);
  }

  return query.where("executive.branch_id", "=", filters.actorBranchId);
}

export function applyLeadListFilters(
  query: LeadListQuery,
  filters: LeadListFilters,
): LeadListQuery {
  let next = query;

  if (filters.executiveId !== undefined) {
    next = next.where("lead.executive_id", "=", filters.executiveId);
  }

  if (filters.stage !== undefined) {
    next = next.where("lead.stage", "=", filters.stage);
  }

  if (filters.status !== undefined) {
    next = next.where("lead.status", "=", filters.status);
  }

  if (filters.priority !== undefined) {
    next = next.where("lead.priority", "=", filters.priority);
  }

  if (filters.updatedSince !== undefined) {
    next = next.where("lead.updated_at", ">=", filters.updatedSince);
  }

  if (filters.updatedUntil !== undefined) {
    next = next.where("lead.updated_at", "<", filters.updatedUntil);
  }

  return applyLeadAnyFieldSearch(next, filters.anyFieldSearch);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function applyLeadAnyFieldSearch(
  query: LeadListQuery,
  anyFieldSearch: string | undefined,
): LeadListQuery {
  if (!anyFieldSearch) {
    return query;
  }

  const pattern = `%${escapeLikePattern(anyFieldSearch)}%`;

  return query.where((eb) =>
    eb.or([
      eb("org.ruc", "ilike", pattern),
      eb("org.legal_name", "ilike", pattern),
      eb("org.address", "ilike", pattern),
      eb("executive.names", "ilike", pattern),
      eb("executive.first_surname", "ilike", pattern),
      eb("creator.names", "ilike", pattern),
      eb("creator.first_surname", "ilike", pattern),
    ]),
  );
}
