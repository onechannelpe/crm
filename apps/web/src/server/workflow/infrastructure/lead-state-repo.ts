import {
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { OrganizationId } from "~/server/shared/ids";
import type { LeadState } from "~/server/workflow/domain/lead/state";

type LeadWithOrgRow = {
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
  deleted_at: number | null;
  reservation_expires_at: number | null;
  version: number;
  ruc: string;
  razon_social: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

function toLeadState(row: LeadWithOrgRow): LeadState {
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
    deletedAt: row.deleted_at,
    reservationExpiresAt: row.reservation_expires_at,
    version: row.version,
  };
}

export type LeadStateRepository = {
  findById(id: string): Promise<LeadState | undefined>;
};

export function createLeadStateRepo(db: DatabaseExecutor): LeadStateRepository {
  return {
    async findById(id: string): Promise<LeadState | undefined> {
      const row = await db
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
          "lead.deleted_at",
          "lead.reservation_expires_at",
          "lead.version",
          "org.ruc",
          "org.name as razon_social",
          "org.address",
          "org.district",
          "org.department",
        ])
        .where("lead.id", "=", id)
        .executeTakeFirst();

      return row ? toLeadState(row as LeadWithOrgRow) : undefined;
    },
  };
}
