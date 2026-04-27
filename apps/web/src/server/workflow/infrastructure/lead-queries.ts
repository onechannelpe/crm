import { sql } from "kysely";
import type { Selectable } from "kysely";

import type { Database } from "~/lib/db/types";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  RecordExportFilters,
  RecordExportRow,
  LeadListFilters,
  LeadListRow,
  LeadQueries,
} from "../application/ports/lead-queries";

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

export function createLeadQueries(db: DatabaseExecutor): LeadQueries {
  return {
    async list(filters: LeadListFilters): Promise<LeadListRow[]> {
      let query = db
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

      // supervisor: branch-scoped via branch_supervisors
      if (filters.actorRole === "supervisor") {
        query = query.where("executive.branch_id", "in", (eb) =>
          eb
            .selectFrom("branch_supervisors")
            .select("branch_id")
            .where("user_id", "=", filters.actorUserId),
        );
      }

      // back_office: team-scoped via back_office_assignments
      if (filters.actorRole === "back_office") {
        query = query.where("executive.team_id", "in", (eb) =>
          eb
            .selectFrom("back_office_assignments")
            .select("team_id")
            .where("back_office_user_id", "=", filters.actorUserId),
        );
      }

      // branch-scoped roles (sales_manager, admin): filter by branch_id
      if (["sales_manager", "admin"].includes(filters.actorRole)) {
        query = query.where("executive.branch_id", "=", filters.actorBranchId);
      }

      if (filters.executiveId !== undefined) {
        query = query.where("lead.executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined) {
        query = query.where("lead.stage", "=", filters.stage);
      }
      if (filters.status !== undefined) {
        query = query.where("lead.status", "=", filters.status);
      }
      if (filters.prioridad !== undefined) {
        query = query.where("lead.prioridad", "=", filters.prioridad);
      }
      if (filters.updatedSinceMs !== undefined) {
        query = query.where("lead.updated_at", ">=", filters.updatedSinceMs);
      }
      if (filters.updatedUntilMs !== undefined) {
        query = query.where("lead.updated_at", "<", filters.updatedUntilMs);
      }

      if (filters.sortBy === "createdAt") {
        query = query.orderBy("lead.created_at", filters.sortDirection);
      } else if (filters.sortBy === "updatedAt") {
        query = query.orderBy("lead.updated_at", filters.sortDirection);
      } else if (filters.sortBy === "registeredBy") {
        query = query.orderBy(
          sql<string>`creator.names || ' ' || creator.first_surname`,
          filters.sortDirection,
        );
      } else {
        query = query.orderBy("lead.ruc", filters.sortDirection);
      }

      const rows = await query
        .orderBy("lead.id", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map(toListRow);
    },

    async count(filters: LeadListFilters): Promise<number> {
      let query = db
        .selectFrom("workflow_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id")
        .select((eb) => eb.fn.countAll<number>().as("count"));

      // supervisor: branch-scoped via branch_supervisors
      if (filters.actorRole === "supervisor") {
        query = query.where("executive.branch_id", "in", (eb) =>
          eb
            .selectFrom("branch_supervisors")
            .select("branch_id")
            .where("user_id", "=", filters.actorUserId),
        );
      }

      // back_office: team-scoped via back_office_assignments
      if (filters.actorRole === "back_office") {
        query = query.where("executive.team_id", "in", (eb) =>
          eb
            .selectFrom("back_office_assignments")
            .select("team_id")
            .where("back_office_user_id", "=", filters.actorUserId),
        );
      }

      // branch-scoped roles (sales_manager, admin): filter by branch_id
      if (["sales_manager", "admin"].includes(filters.actorRole)) {
        query = query.where("executive.branch_id", "=", filters.actorBranchId);
      }

      if (filters.executiveId !== undefined) {
        query = query.where("lead.executive_id", "=", filters.executiveId);
      }
      if (filters.stage !== undefined) {
        query = query.where("lead.stage", "=", filters.stage);
      }
      if (filters.status !== undefined) {
        query = query.where("lead.status", "=", filters.status);
      }
      if (filters.prioridad !== undefined) {
        query = query.where("lead.prioridad", "=", filters.prioridad);
      }
      if (filters.updatedSinceMs !== undefined) {
        query = query.where("lead.updated_at", ">=", filters.updatedSinceMs);
      }
      if (filters.updatedUntilMs !== undefined) {
        query = query.where("lead.updated_at", "<", filters.updatedUntilMs);
      }

      const row = await query.executeTakeFirstOrThrow();
      return row.count;
    },

    async export(filters: RecordExportFilters): Promise<RecordExportRow[]> {
      let query = db
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

      // supervisor: branch-scoped via branch_supervisors
      if (filters.actorRole === "supervisor") {
        query = query.where("executive.branch_id", "in", (eb) =>
          eb
            .selectFrom("branch_supervisors")
            .select("branch_id")
            .where("user_id", "=", filters.actorUserId),
        );
      }

      // back_office: team-scoped via back_office_assignments
      if (filters.actorRole === "back_office") {
        query = query.where("executive.team_id", "in", (eb) =>
          eb
            .selectFrom("back_office_assignments")
            .select("team_id")
            .where("back_office_user_id", "=", filters.actorUserId),
        );
      }

      // branch-scoped roles (sales_manager, admin): filter by branch_id
      if (["sales_manager", "admin"].includes(filters.actorRole)) {
        query = query.where("executive.branch_id", "=", filters.actorBranchId);
      }

      if (filters.executiveId !== undefined) {
        query = query.where("lead.executive_id", "=", filters.executiveId);
      }

      const rows = await query.orderBy("lead.created_at", "desc").execute();
      return rows.map(toExportRow);
    },
  };
}
