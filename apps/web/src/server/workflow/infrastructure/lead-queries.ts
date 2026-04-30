import type { SelectQueryBuilder } from "kysely";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  LeadListFilters,
  LeadQueries,
  RecordExportFilters,
} from "../application/ports/lead-queries";
import type { LeadQueryDatabase } from "./lead-query-types";

type VisibilityQuery = SelectQueryBuilder<
  LeadQueryDatabase,
  "lead" | "executive",
  any
>;

function toFullName(names: string, firstSurname: string): string {
  return `${names} ${firstSurname}`;
}

function applyVisibility(
  query: VisibilityQuery,
  filters: LeadListFilters | RecordExportFilters,
): VisibilityQuery {
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

export function createLeadQueries(db: DatabaseExecutor): LeadQueries {
  return {
    async list(filters) {
      const base = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id");

      let q = applyVisibility(base, filters)
        .innerJoin("users as creator", "creator.id", "lead.created_by")
        .innerJoin("organizations as org", "org.id", "lead.organization_id")
        .select([
          "lead.id",
          "org.ruc",
          "org.name as razon_social",
          "org.address",
          "lead.executive_id",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "lead.created_by",
          "creator.names as creator_names",
          "creator.first_surname as creator_first_surname",
          "lead.stage",
          "lead.status",
          "lead.prioridad",
          "lead.created_at",
          "lead.updated_at",
        ]);

      if (filters.executiveId !== undefined) {
        q = q.where("lead.executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined)
        q = q.where("lead.stage", "=", filters.stage);
      if (filters.status !== undefined)
        q = q.where("lead.status", "=", filters.status);
      if (filters.prioridad !== undefined) {
        q = q.where("lead.prioridad", "=", filters.prioridad);
      }
      if (filters.updatedSinceMs !== undefined) {
        q = q.where("lead.updated_at", ">=", filters.updatedSinceMs);
      }
      if (filters.updatedUntilMs !== undefined) {
        q = q.where("lead.updated_at", "<", filters.updatedUntilMs);
      }

      if (filters.sortBy === "createdAt")
        q = q.orderBy("lead.created_at", filters.sortDirection);
      else if (filters.sortBy === "updatedAt")
        q = q.orderBy("lead.updated_at", filters.sortDirection);
      else if (filters.sortBy === "registeredBy") {
        q = q
          .orderBy("creator.names", filters.sortDirection)
          .orderBy("creator.first_surname", filters.sortDirection);
      } else q = q.orderBy("org.ruc", filters.sortDirection);

      const rows = await q
        .orderBy("lead.id", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map((row) => ({
        id: row.id,
        ruc: row.ruc,
        razonSocial: row.razon_social,
        address: row.address,
        executiveId: row.executive_id,
        executiveName: toFullName(
          row.executive_names,
          row.executive_first_surname,
        ),
        createdBy: row.created_by,
        createdByName: toFullName(row.creator_names, row.creator_first_surname),
        stage: row.stage,
        status: row.status,
        prioridad: row.prioridad,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    async count(filters) {
      let q = applyVisibility(
        db
          .selectFrom("workflow_leads as lead")
          .innerJoin("users as executive", "executive.id", "lead.executive_id")
          .select((eb) => eb.fn.countAll<number>().as("count")),
        filters,
      );

      if (filters.executiveId !== undefined) {
        q = q.where("lead.executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined)
        q = q.where("lead.stage", "=", filters.stage);
      if (filters.status !== undefined)
        q = q.where("lead.status", "=", filters.status);
      if (filters.prioridad !== undefined) {
        q = q.where("lead.prioridad", "=", filters.prioridad);
      }
      if (filters.updatedSinceMs !== undefined) {
        q = q.where("lead.updated_at", ">=", filters.updatedSinceMs);
      }
      if (filters.updatedUntilMs !== undefined) {
        q = q.where("lead.updated_at", "<", filters.updatedUntilMs);
      }

      const row = await q.executeTakeFirstOrThrow();
      return Number(row.count);
    },

    async export(filters) {
      const base = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id");
      let q = applyVisibility(base, filters)
        .innerJoin("organizations as org", "org.id", "lead.organization_id")
        .select([
          "lead.id",
          "org.ruc",
          "org.name as razon_social",
          "org.address",
          "lead.executive_id",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "lead.stage",
          "lead.status",
          "lead.prioridad",
          "lead.created_at",
        ]);

      if (filters.executiveId !== undefined) {
        q = q.where("lead.executive_id", "=", filters.executiveId);
      }

      const rows = await q.orderBy("lead.created_at", "desc").execute();

      return rows.map((row) => ({
        id: row.id,
        ruc: row.ruc,
        razonSocial: row.razon_social,
        address: row.address,
        executiveId: row.executive_id,
        executiveName: toFullName(
          row.executive_names,
          row.executive_first_surname,
        ),
        stage: row.stage,
        status: row.status,
        prioridad: row.prioridad,
        createdAt: row.created_at,
      }));
    },
  };
}
