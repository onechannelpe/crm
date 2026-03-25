import type { Repositories } from "~/server/shared/registry";

import type { CrmJobBlobStore } from "./blob-store";

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return escapeCsv(String(value));
  }
  return escapeCsv(JSON.stringify(value));
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((h) => cell(row[h])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export function createExportService(
  repos: Repositories,
  blobStore: CrmJobBlobStore,
) {
  return {
    async runBatch(
      batchSize: number,
      leaseMs: number,
      workerId: string,
    ): Promise<number> {
      const ids = await repos.integrationJobs.claimPending(
        leaseMs,
        workerId,
        batchSize,
      );
      let processed = 0;

      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        const job = await repos.integrationJobs.findById(id);
        if (!job || job.type !== "export") continue;

        try {
          // eslint-disable-next-line no-await-in-loop
          const leads = await repos.leads.listForExport({});
          const exportRows: Record<string, unknown>[] = leads.map((l) => ({
            ruc: l.ruc,
            razon_social: l.razon_social ?? "",
            executive_id: l.executive_id,
            executive_name: l.executive_name ?? "",
            created_at: new Date(l.created_at).toISOString().slice(0, 10),
            stage: l.stage,
            address: l.address ?? "",
            estado: l.estado ?? "",
            prioridad: l.prioridad ?? "",
          }));
          const csv = buildCsv(exportRows);
          const key = `export-${id}.csv`;
          // eslint-disable-next-line no-await-in-loop
          await blobStore.put(key, new TextEncoder().encode(csv));
          // eslint-disable-next-line no-await-in-loop
          await repos.integrationJobs.setFilePath(id, key);
          // eslint-disable-next-line no-await-in-loop
          await repos.integrationJobs.markCompleted(id, {
            rowsTotal: exportRows.length,
            rowsApplied: exportRows.length,
            rowsFailed: 0,
            resultsJson: null,
          });
          processed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          // eslint-disable-next-line no-await-in-loop
          await repos.integrationJobs.markFailed(id, msg);
        }
      }

      return processed;
    },
  };
}
