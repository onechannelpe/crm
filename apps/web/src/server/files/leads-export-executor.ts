import { TextEncoder } from "node:util";

import { buildLeadExportCsv } from "~/server/integrations/infrastructure/lead-export-builder";

import type { SyncExecutor } from "./service/contracts";

export function createLeadsExportExecutor(leadExportQuery: {
  export(filters: { executiveId?: number }): Promise<
    Array<{
      ruc: string;
      razonSocial: string | null;
      executiveId: number;
      executiveName: string;
      createdAt: number;
      stage: string;
      address: string | null;
      status: string | null;
      prioridad: string | null;
    }>
  >;
}): SyncExecutor {
  return {
    async run(_artifactType, _context) {
      const leads = await leadExportQuery.export({});
      const csv = buildLeadExportCsv(
        leads.map((lead) => ({
          ruc: lead.ruc,
          razon_social: lead.razonSocial ?? "",
          executive_id: lead.executiveId,
          executive_name: lead.executiveName,
          created_at: new Date(lead.createdAt).toISOString().slice(0, 10),
          stage: lead.stage,
          address: lead.address ?? "",
          status: lead.status ?? "",
          prioridad: lead.prioridad ?? "",
        })),
      );
      const bytes = new TextEncoder().encode(csv);
      return { bytes, filename: "leads-export.csv" };
    },
  };
}
