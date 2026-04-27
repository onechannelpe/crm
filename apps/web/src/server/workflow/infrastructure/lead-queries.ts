import { sql } from "kysely";
import type { Selectable, SelectQueryBuilder, ExpressionBuilder } from "kysely";

import type { Database } from "~/lib/db/types";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  RecordExportFilters,
  RecordExportRow,
  LeadListFilters,
  LeadListRow,
  LeadQueries,
} from "../application/ports/lead-queries";
import type { LeadQueryDatabase } from "./lead-query-types";

type LeadCols = Selectable<Database["workflow_leads"]>;

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

function applyVisibility<
  DB extends LeadQueryDatabase,
  TB extends keyof DB & string,
  O,
>(
  query: SelectQueryBuilder<DB, TB, O>,
  filters: LeadListFilters | RecordExportFilters,
): SelectQueryBuilder<DB, TB, O> {
  if (filters.actorRole === "superuser") {
    return query;
  }

  if (filters.actorRole === "supervisor") {
    return query.where(
      sql`executive.branch_id`,
      "in",
      (eb: ExpressionBuilder<Database, any>) =>
        eb
          .selectFrom("branch_supervisors")
          .select("branch_id")
          .where("user_id", "=", filters.actorUserId),
    );
  }

  if (filters.actorRole === "back_office") {
    return query.where(
      sql`executive.team_id`,
      "in",
      (eb: ExpressionBuilder<Database, any>) =>
        eb
          .selectFrom("back_office_assignments")
          .select("team_id")
          .where("back_office_user_id", "=", filters.actorUserId),
    );
  }

  if (filters.actorRole === "executive") {
    return query.where(sql`lead.executive_id`, "=", filters.actorUserId);
  }

  // Default restriction for all other roles (admin, sales_manager, logistics, hr, etc.)
  return query.where(sql`executive.branch_id`, "=", filters.actorBranchId);
}

export function createLeadQueries(db: DatabaseExecutor): LeadQueries {
  return {
    async list(filters: LeadListFilters): Promise<LeadListRow[]> {
      const query = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id")
        .innerJoin("users as creator", "creator.id", "lead.created_by")
        .select([
          "lead.id",
          "lead.ruc",
          "lead.razon_social",
          "lead.address",
          "lead.executive_id",
          sql<string>`executive.names || ' ' || executive.first_surname`.as(
            "executive_name",
          ),
          "lead.created_by",
          sql<string>`creator.names || ' ' || creator.first_surname`.as(
            "created_by_name",
          ),
          "lead.stage",
          "lead.status",
          "lead.prioridad",
          "lead.created_at",
          "lead.updated_at",
        ]);

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

      if (filters.sortBy === "createdAt") {
        q = q.orderBy("lead.created_at", filters.sortDirection);
      } else if (filters.sortBy === "updatedAt") {
        q = q.orderBy("lead.updated_at", filters.sortDirection);
      } else if (filters.sortBy === "registeredBy") {
        q = q.orderBy(
          sql<string>`creator.names || ' ' || creator.first_surname`,
          filters.sortDirection,
        );
      } else {
        q = q.orderBy("lead.ruc", filters.sortDirection);
      }

      const rows = await q
        .orderBy("lead.id", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map(toListRow);
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
          sql<string>`executive.names || ' ' || executive.first_surname`.as(
            "executive_name",
          ),
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
      return rows.map(toExportRow);
    },
  };
}
