import type { Insertable, Selectable, Updateable } from "kysely";

import type { Database } from "~/lib/db/types";
import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "~/server/pipeline/domain/lead-record";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUuidV7 } from "~/server/shared/uuid-v7";

export type LeadRow = Selectable<Database["workflow_leads"]>;
export type NewLeadRow = Insertable<Database["workflow_leads"]>;
export type LeadRowPatch = Updateable<Database["workflow_leads"]>;

function toLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razon_social,
    address: row.address,
    district: row.district,
    department: row.department,
    executiveId: row.executive_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by ?? null,
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
    created_by: values.createdBy,
    updated_by: values.updatedBy ?? undefined,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    created_at: values.createdAt,
    updated_at: values.updatedAt,
  };
}

export function toLeadPatchRow(values: LeadPatch): LeadRowPatch {
  return {
    razon_social: values.razonSocial,
    address: values.address,
    district: values.district,
    department: values.department,
    executive_id: values.executiveId,
    updated_by: values.updatedBy,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    updated_at: values.updatedAt,
  };
}

export function createLeadRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadDraft): Promise<string> {
      const id = createUuidV7();
      await db
        .insertInto("workflow_leads")
        .values({ ...toNewLeadRow(values), id })
        .executeTakeFirstOrThrow();

      return id;
    },

    async findById(id: string) {
      const row = await db
        .selectFrom("workflow_leads")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? toLead(row) : undefined;
    },

    async findByRuc(ruc: string) {
      const row = await db
        .selectFrom("workflow_leads")
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
        .selectFrom("workflow_leads")
        .selectAll()
        .where("ruc", "in", rucs)
        .execute();
      return rows.map(toLead);
    },

    updateById(id: string, values: LeadPatch) {
      return db
        .updateTable("workflow_leads")
        .set(toLeadPatchRow(values))
        .where("id", "=", id)
        .execute();
    },

    updateByRuc(ruc: string, values: LeadPatch) {
      return db
        .updateTable("workflow_leads")
        .set(toLeadPatchRow(values))
        .where("ruc", "=", ruc)
        .execute();
    },
  };
}
