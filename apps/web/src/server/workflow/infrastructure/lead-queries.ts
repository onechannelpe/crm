import type { Selectable, SelectQueryBuilder } from "kysely";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  RecordExportFilters,
  RecordExportRow,
  LeadListFilters,
  LeadListRow,
  LeadQueries,
} from "../application/ports/lead-queries";
import type { LeadQueryDatabase } from "./lead-query-types";

type LeadCols = Selectable<LeadQueryDatabase["workflow_leads"]>;

type LeadListSource = Pick<
  LeadCols,
  | "id"
  | "ruc"
  | "razon_social"
  | "address"
  | "executive_id"
  | "created_by"
  | "stage"
  | "status"
  | "prioridad"
  | "created_at"
  | "updated_at"
> & { executive_name: string; created_by_name: string };

type RecordExportSource = Pick<
  LeadCols,
  | "id"
  | "ruc"
  | "razon_social"
  | "address"
  | "executive_id"
  | "stage"
  | "status"
  | "prioridad"
  | "created_at"
> & { executive_name: string };

function toFullName(names: string, firstSurname: string): string {
  return `${names} ${firstSurname}`;
}

function toListRow(row: LeadListSource): LeadListRow {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    executiveId: row.executive_id,
    executiveName: row.executive_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    stage: row.stage,
    status: row.status,
    prioridad: row.prioridad,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExportRow(row: RecordExportSource): RecordExportRow {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    executiveId: row.executive_id,
    executiveName: row.executive_name,
    stage: row.stage,
    status: row.status,
    prioridad: row.prioridad,
    createdAt: row.created_at,
  };
}

function applyVisibility<O>(
  query: SelectQueryBuilder<LeadQueryDatabase, "lead" | "executive", O>,
  filters: LeadListFilters | RecordExportFilters,
): SelectQueryBuilder<LeadQueryDatabase, "lead" | "executive", O> {
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

export function createLeadQueries(db: DatabaseExecutor): LeadQueries {
  return {
    async list(filters: LeadListFilters): Promise<LeadListRow[]> {
      const base = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id");

      let q = applyVisibility(base, filters)
        .innerJoin("users as creator", "creator.id", "lead.created_by")
        .select([
          "lead.id",
          "lead.ruc",
          "lead.razon_social",
          "lead.address",
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
      if (filters.stage !== undefined) {
        q = q.where("lead.stage", "=", filters.stage);
      }
      if (filters.status !== undefined) {
        q = q.where("lead.status", "=", filters.status);
      }
      if (filters.prioridad !== undefined) {
        q = q.where("lead.prioridad", "=", filters.prioridad);
      }
      if (filters.updatedSinceMs !== undefined) {
        q = q.where("lead.updated_at", ">=", filters.updatedSinceMs);
      }
      if (filters.updatedUntilMs !== undefined) {
        q = q.where("lead.updated_at", "<", filters.updatedUntilMs);
      }

      if (filters.sortBy === "createdAt") {
        q = q.orderBy("lead.created_at", filters.sortDirection);
      } else if (filters.sortBy === "updatedAt") {
        q = q.orderBy("lead.updated_at", filters.sortDirection);
      } else if (filters.sortBy === "registeredBy") {
        q = q
          .orderBy("creator.names", filters.sortDirection)
          .orderBy("creator.first_surname", filters.sortDirection);
      } else {
        q = q.orderBy("lead.ruc", filters.sortDirection);
      }

      const rows = await q
        .orderBy("lead.id", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map((row) =>
        toListRow({
          ...row,
          executive_name: toFullName(
            row.executive_names,
            row.executive_first_surname,
          ),
          created_by_name: toFullName(
            row.creator_names,
            row.creator_first_surname,
          ),
        }),
      );
    },

    async count(filters: LeadListFilters): Promise<number> {
      const query = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id")
        .select((eb) => eb.fn.countAll<number>().as("count"));

      let q = applyVisibility(query, filters);

      if (filters.executiveId !== undefined) {
        q = q.where("lead.executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined) {
        q = q.where("lead.stage", "=", filters.stage);
      }
      if (filters.status !== undefined) {
        q = q.where("lead.status", "=", filters.status);
      }
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
      return row.count;
    },

    async export(filters: RecordExportFilters): Promise<RecordExportRow[]> {
      const query = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id")
        .select([
          "lead.id",
          "lead.ruc",
          "lead.razon_social",
          "lead.address",
          "lead.executive_id",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "lead.stage",
          "lead.status",
          "lead.prioridad",
          "lead.created_at",
        ]);

      let q = applyVisibility(query, filters);

      if (filters.executiveId !== undefined) {
        q = q.where("lead.executive_id", "=", filters.executiveId);
      }

      const rows = await q.orderBy("lead.created_at", "desc").execute();
      return rows.map((row) =>
        toExportRow({
          ...row,
          executive_name: toFullName(
            row.executive_names,
            row.executive_first_surname,
          ),
        }),
      );
    },
  };
}
