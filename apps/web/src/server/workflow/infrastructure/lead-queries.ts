import { sql } from "kysely";
import type { Selectable } from "kysely";

import type { Database } from "~/lib/db/types";

import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  LeadExportFilters,
  LeadExportRow,
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
  | "stage"
  | "status"
  | "prioridad"
  | "created_at"
  | "updated_at"
> & { executive_name: string };

type LeadExportSource = Pick<
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
    stage: row.stage,
    status: row.status,
    prioridad: row.prioridad,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExportRow(row: LeadExportSource): LeadExportRow {
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
          "lead.updated_at",
        ]);

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

      const rows = await query
        .orderBy("lead.created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();

      return rows.map(toListRow);
    },

    async count(filters: LeadListFilters): Promise<number> {
      let query = db
        .selectFrom("workflow_leads as lead")
        .select((eb) => eb.fn.countAll<number>().as("count"));

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

      const row = await query.executeTakeFirstOrThrow();
      return row.count;
    },

    async export(filters: LeadExportFilters): Promise<LeadExportRow[]> {
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

      if (filters.executiveId !== undefined) {
        query = query.where("lead.executive_id", "=", filters.executiveId);
      }

      const rows = await query.orderBy("lead.created_at", "desc").execute();
      return rows.map(toExportRow);
    },
  };
}
