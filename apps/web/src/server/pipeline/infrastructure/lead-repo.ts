import type {
  Insertable,
  SelectQueryBuilder,
  Selectable,
  Updateable,
} from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadDraft, LeadPatch } from "~/server/pipeline/domain/lead";
import type {
  Lead,
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/server/pipeline/domain/lead";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { LeadExportRow, LeadListFilters } from "../application/ports";

export type LeadRow = Selectable<Database["pipeline_leads"]>;
export type NewLeadRow = Insertable<Database["pipeline_leads"]>;
export type LeadUpdateRow = Updateable<Database["pipeline_leads"]>;

type LeadExportRowSource = {
  id: number;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  created_at: number;
  executive_id: number;
  executive_name: string;
};

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    executiveId: row.executive_id,
    stage: row.stage,
    status: row.status,
    prioridad: row.prioridad,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNewLeadRow(values: LeadDraft): NewLeadRow {
  return {
    ruc: values.ruc,
    razon_social: values.razonSocial,
    address: values.address,
    executive_id: values.executiveId,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    created_at: values.createdAt,
    updated_at: values.updatedAt,
  };
}

function toLeadUpdateRow(values: LeadPatch): LeadUpdateRow {
  return {
    executive_id: values.executiveId,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    updated_at: values.updatedAt,
  };
}

function applyLeadFilters<TRow>(
  query: SelectQueryBuilder<Database, "pipeline_leads", TRow>,
  filters: LeadListFilters,
) {
  let nextQuery = query;

  if (filters.executiveId !== undefined) {
    nextQuery = nextQuery.where("executive_id", "=", filters.executiveId);
  }
  if (filters.stage !== undefined) {
    nextQuery = nextQuery.where("stage", "=", filters.stage);
  }
  if (filters.status !== undefined) {
    nextQuery = nextQuery.where("status", "=", filters.status);
  }
  if (filters.prioridad !== undefined) {
    nextQuery = nextQuery.where("prioridad", "=", filters.prioridad);
  }

  return nextQuery;
}

function toLeadExportRow(row: LeadExportRowSource): LeadExportRow {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    stage: row.stage,
    status: row.status,
    prioridad: row.prioridad,
    createdAt: row.created_at,
    executiveId: row.executive_id,
    executiveName: row.executive_name,
  };
}

export function createLeadRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadDraft): Promise<number> {
      const result = await db
        .insertInto("pipeline_leads")
        .values(toNewLeadRow(values))
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async findById(id: number) {
      const row = await db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findByRuc(ruc: string) {
      const row = await db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findByRucMany(rucs: string[]) {
      if (rucs.length === 0) {
        return [];
      }

      const rows = await db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("ruc", "in", rucs)
        .execute();
      return rows.map(toLead);
    },

    updateById(id: number, values: LeadPatch) {
      return db
        .updateTable("pipeline_leads")
        .set(
          toLeadUpdateRow({
            ...values,
            updatedAt: values.updatedAt ?? Date.now(),
          }),
        )
        .where("id", "=", id)
        .execute();
    },

    async list(filters: LeadListFilters) {
      const rows = await applyLeadFilters(
        db.selectFrom("pipeline_leads").selectAll(),
        filters,
      )
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();
      return rows.map(toLead);
    },

    async count(filters: LeadListFilters) {
      const row = await applyLeadFilters(
        db
          .selectFrom("pipeline_leads")
          .select((eb) => eb.fn.countAll<number>().as("count")),
        filters,
      ).executeTakeFirstOrThrow();

      return Number(row.count);
    },

    async listForExport(filters: {
      executiveId?: number;
    }): Promise<LeadExportRow[]> {
      let query = db
        .selectFrom("pipeline_leads as lead")
        .innerJoin("users as executive", "executive.id", "lead.executive_id")
        .select([
          "lead.id",
          "lead.ruc",
          "lead.razon_social",
          "lead.address",
          "lead.stage",
          "lead.status",
          "lead.prioridad",
          "lead.created_at",
          "lead.executive_id",
          "executive.names as executive_name",
        ]);

      if (filters.executiveId !== undefined) {
        query = query.where("lead.executive_id", "=", filters.executiveId);
      }

      const rows = await query.orderBy("lead.created_at", "desc").execute();
      return rows.map(toLeadExportRow);
    },
  };
}
