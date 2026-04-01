import type { Insertable, Selectable, Updateable } from "kysely";

import type {
  Database,
  LeadStage,
  LeadStatus,
  Prioridad,
} from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type RecordRow = Selectable<Database["pipeline_leads"]>;
export type NewRecordRow = Insertable<Database["pipeline_leads"]>;
export type RecordUpdateRow = Updateable<Database["pipeline_leads"]>;

export interface RecordListFilters {
  executiveId?: number;
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: Prioridad;
  limit: number;
  offset: number;
}

function applyFilters(query: any, filters: RecordListFilters) {
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

export function createRecordRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewRecordRow): Promise<number> {
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
        return Promise.resolve([] as RecordRow[]);
      }

      return db
        .selectFrom("pipeline_leads")
        .selectAll()
        .where("ruc", "in", rucs)
        .execute();
    },

    updateById(id: number, values: RecordUpdateRow) {
      return db
        .updateTable("pipeline_leads")
        .set({ ...values, updated_at: values.updated_at ?? Date.now() })
        .where("id", "=", id)
        .execute();
    },

    list(filters: RecordListFilters) {
      return applyFilters(db.selectFrom("pipeline_leads").selectAll(), filters)
        .orderBy("created_at", "desc")
        .limit(filters.limit)
        .offset(filters.offset)
        .execute();
    },

    async count(filters: RecordListFilters) {
      const row = await applyFilters(
        db
          .selectFrom("pipeline_leads")
          .select((eb) => eb.fn.countAll<number>().as("count")),
        filters,
      ).executeTakeFirstOrThrow();

      return Number(row.count);
    },

    listForExport(filters: { executiveId?: number }) {
      let query = db
        .selectFrom("pipeline_leads as record")
        .innerJoin("users as executive", "executive.id", "record.executive_id")
        .select([
          "record.id",
          "record.ruc",
          "record.razon_social",
          "record.address",
          "record.stage",
          "record.status",
          "record.prioridad",
          "record.created_at",
          "record.executive_id",
          "executive.names as executive_name",
        ]);

      if (filters.executiveId !== undefined) {
        query = query.where("record.executive_id", "=", filters.executiveId);
      }

      return query.orderBy("record.created_at", "desc").execute();
    },
  };
}
