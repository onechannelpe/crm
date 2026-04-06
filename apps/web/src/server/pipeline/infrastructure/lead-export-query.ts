import type { DatabaseExecutor } from "../../shared/db-executor";
import type {
  LeadExportQuery,
  LeadExportRow,
} from "../application/ports/lead-repository";
import type { LeadPriority, LeadStage, LeadStatus } from "../domain/lead";

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

export function createLeadExportQuery(db: DatabaseExecutor): LeadExportQuery {
  return {
    async list(filters) {
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
