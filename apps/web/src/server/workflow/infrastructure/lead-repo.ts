import { randomUUIDv7 } from "bun";
import type { Insertable, Updateable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "~/server/workflow/domain/lead-record";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

export type LeadRow = {
  id: string;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  organization_id: number;
  executive_id: number;
  created_by: number;
  updated_by: number | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  created_at: number;
  updated_at: number;
};
export type NewLeadRow = Insertable<Database["workflow_leads"]>;
export type LeadRowPatch = Updateable<Database["workflow_leads"]>;

function toLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
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
    organization_id: values.organizationId,
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
      const id = randomUUIDv7();
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
