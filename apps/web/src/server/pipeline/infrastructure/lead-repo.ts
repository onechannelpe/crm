import type {
  Insertable,
  SelectQueryBuilder,
  Selectable,
  Updateable,
} from "kysely";

import type {
  Database,
  LeadStage,
  LeadStatus,
  Prioridad,
} from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type LeadRow = Selectable<Database["pipeline_leads"]>;
export type NewLeadRow = Insertable<Database["pipeline_leads"]>;
export type LeadUpdateRow = Updateable<Database["pipeline_leads"]>;

export interface LeadListFilters {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: Prioridad;
  limit: number;
  offset: number;
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

export function createLeadRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewLeadRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_leads")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByRuc(ruc: string) {
      return db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("ruc", "=", ruc)
        .executeTakeFirst();
    },

    findByRucMany(rucs: string[]) {
      if (rucs.length === 0) {
        return Promise.resolve([] as LeadRow[]);
      }

      return db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("ruc", "in", rucs)
        .execute();
    },

    updateById(id: number, values: LeadUpdateRow) {
      return db
        .updateTable("pipeline_leads")
        .set({ ...values, updated_at: values.updated_at ?? Date.now() })
        .where("id", "=", id)
        .execute();
    },

    list(filters: LeadListFilters) {
      return applyLeadFilters(
        db.selectFrom("pipeline_leads").selectAll(),
        filters,
      )
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();
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

    listForExport(filters: { executiveId?: number }) {
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

      return query.orderBy("lead.created_at", "desc").execute();
    },
  };
}
