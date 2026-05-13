import { randomUUIDv7 } from "bun";
import type { Insertable, Updateable } from "kysely";

import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { OrganizationId } from "~/server/shared/ids";
import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "~/server/workflow/domain/lead-record";

export type LeadRow = {
  id: string;
  organization_id: OrganizationId;
  executive_id: number;
  created_by: number;
  updated_by: number | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  created_at: number;
  updated_at: number;
};

type LeadWithOrganizationRow = LeadRow & {
  ruc: string;
  razon_social: string;
  address: string | null;
  district: string | null;
  department: string | null;
};
export type NewLeadRow = Insertable<Database["workflow_leads"]>;
export type LeadRowPatch = Updateable<Database["workflow_leads"]>;

function toLead(row: LeadWithOrganizationRow): LeadRecord {
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
    executive_id: values.executiveId,
    updated_by: values.updatedBy,
    stage: values.stage,
    status: values.status,
    prioridad: values.prioridad,
    updated_at: values.updatedAt,
  };
}

export function createLeadRepo(db: DatabaseExecutor) {
  const selectLeadWithOrganization = db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .select([
      "lead.id",
      "lead.organization_id",
      "lead.executive_id",
      "lead.created_by",
      "lead.updated_by",
      "lead.stage",
      "lead.status",
      "lead.prioridad",
      "lead.created_at",
      "lead.updated_at",
      "org.ruc",
      "org.name as razon_social",
      "org.address",
      "org.district",
      "org.department",
    ]);

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
      const row = await selectLeadWithOrganization
        .where("lead.id", "=", id)
        .executeTakeFirst();
      return row ? toLead(row as LeadWithOrganizationRow) : undefined;
    },

    async findByRuc(ruc: string) {
      const row = await selectLeadWithOrganization
        .where("org.ruc", "=", ruc)
        .executeTakeFirst();
      return row ? toLead(row as LeadWithOrganizationRow) : undefined;
    },

    async findByRucMany(rucs: string[]) {
      if (rucs.length === 0) {
        return [];
      }

      const rows = await selectLeadWithOrganization
        .where("org.ruc", "in", rucs)
        .execute();
      return rows.map((row) => toLead(row as LeadWithOrganizationRow));
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
        .where(
          "organization_id",
          "=",
          db.selectFrom("organizations").select("id").where("ruc", "=", ruc),
        )
        .execute();
    },
  };
}
