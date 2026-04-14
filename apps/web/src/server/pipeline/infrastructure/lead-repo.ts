import type { Insertable, Selectable, Updateable } from "kysely";

import type { Database } from "~/lib/db/types";
import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "~/server/pipeline/domain/lead-record";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type LeadRow = Selectable<Database["pipeline_leads"]>;
export type NewLeadRow = Insertable<Database["pipeline_leads"]>;
export type LeadRowPatch = Updateable<Database["pipeline_leads"]>;

function toLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    district: row.district,
    department: row.department,
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
    district: values.district,
    department: values.department,
    executive_id: values.executiveId,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    created_at: values.createdAt,
    updated_at: values.updatedAt,
  };
}

function toLeadPatchRow(values: LeadPatch): LeadRowPatch {
  return {
    razon_social: values.razonSocial,
    address: values.address,
    district: values.district,
    department: values.department,
    executive_id: values.executiveId,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    updated_at: values.updatedAt,
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
        .set(toLeadPatchRow(values))
        .where("id", "=", id)
        .execute();
    },

    updateByRuc(ruc: string, values: LeadPatch) {
      return db
        .updateTable("pipeline_leads")
        .set(toLeadPatchRow(values))
        .where("ruc", "=", ruc)
        .execute();
    },
  };
}
