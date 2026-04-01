import type { Insertable, Selectable, Updateable } from "kysely";

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
  fromDate?: number;
  toDate?: number;
  limit: number;
  offset: number;
}

export function createLeadRepo(db: DatabaseExecutor) {
  function applyFilters(query: any, filters: LeadListFilters) {
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
    if (filters.fromDate !== undefined) {
      nextQuery = nextQuery.where("created_at", ">=", filters.fromDate);
    }
    if (filters.toDate !== undefined) {
      nextQuery = nextQuery.where("created_at", "<=", filters.toDate);
    }

    return nextQuery;
  }

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
      if (rucs.length === 0) return Promise.resolve([] as LeadRow[]);
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
      return applyFilters(db.selectFrom("pipeline_leads").selectAll(), filters)
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();
    },

    async count(filters: LeadListFilters) {
      const row = await applyFilters(
        db
          .selectFrom("pipeline_leads")
          .select((eb) => eb.fn.countAll<number>().as("count")),
        filters,
      ).executeTakeFirstOrThrow();

      return Number(row.count);
    },

    listForExport(filters: {
      fromDate?: number;
      toDate?: number;
      executiveId?: number;
    }) {
      let query = db
        .selectFrom("pipeline_leads as l")
        .innerJoin("users as u", "u.id", "l.executive_id")
        .select([
          "l.id",
          "l.ruc",
          "l.razon_social",
          "l.address",
          "l.stage",
          "l.status",
          "l.prioridad",
          "l.created_at",
          "l.executive_id",
          "u.names as executive_name",
        ]);

      if (filters.fromDate !== undefined) {
        query = query.where("l.created_at", ">=", filters.fromDate);
      }
      if (filters.toDate !== undefined) {
        query = query.where("l.created_at", "<=", filters.toDate);
      }
      if (filters.executiveId !== undefined) {
        query = query.where("l.executive_id", "=", filters.executiveId);
      }

      return query.orderBy("l.created_at", "desc").execute();
    },
  };
}
