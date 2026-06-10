import { sql, type SelectQueryBuilder } from "kysely";

import type {
  LeadListFilters,
  RecordExportFilters,
} from "../application/ports/lead";
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
  // Soft-deleted leads stay out of every active read path (list, count, export).
  query = query.where("lead.deleted_at", "is", null);

  if (filters.actorRole === "superuser") return query;

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
  if (filters.prioridad !== undefined) {
    next = next.where("lead.prioridad", "=", filters.prioridad);
  }
  if (filters.updatedSinceMs !== undefined) {
    next = next.where("lead.updated_at", ">=", filters.updatedSinceMs);
  }
  if (filters.updatedUntilMs !== undefined) {
    next = next.where("lead.updated_at", "<", filters.updatedUntilMs);
  }

  return applyLeadAnyFieldSearch(next, filters.anyFieldSearch);
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function applyLeadAnyFieldSearch(
  query: LeadListQuery,
  anyFieldSearch: string | undefined,
) {
  if (!anyFieldSearch) return query;

  const pattern = `%${escapeLikePattern(anyFieldSearch)}%`;
  const escapeChar = "\\";

  return query.where((eb) =>
    eb.or([
      sql<boolean>`org.ruc like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(org.name) like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(org.address) like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(executive.names) like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(executive.first_surname) like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(creator.names) like ${pattern} escape ${escapeChar}`,
      sql<boolean>`lower(creator.first_surname) like ${pattern} escape ${escapeChar}`,
    ]),
  );
}
