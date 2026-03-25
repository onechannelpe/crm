import { toEstado, toPrioridad } from "~/lib/db/types";
import type { Estado, Prioridad } from "~/lib/db/types";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";

import type { CrmJobBlobStore } from "./blob-store";
import { parseCsv, validateHeaders } from "./csv-parser";

// Column names after csv-parser header normalization (lowercase, no accents, spaces→_).
const ESTADO_COLUMNS = [
  "nro_de_solicitud",
  "fecha_de_solicitud",
  "canal",
  "nombre_de_agencia_dealer",
  "documento",
  "resultado",
];

const PRIORIDAD_COLUMNS = [
  "nro_de_solicitud",
  "fecha",
  "usuario",
  "dealer",
  "documento",
  "segmento",
  "prioridad",
  "categoria",
];

/**
 * Normalizes the raw "Resultado" cell to an uppercase Estado candidate.
 * The source files use mixed case e.g. "Sin resultado", "Stock".
 */
function normalizeEstadoRaw(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Normalizes the raw "Prioridad" cell.
 * Values may be "Sin Resultado" or compound like "P2 B1" — extract leading P1/P2 token.
 */
function normalizePrioridadRaw(raw: string): string {
  const upper = raw.trim().toUpperCase();
  // "P2 B1", "P1 B2" etc. — keep only the P-tier prefix
  const first = upper.split(/\s+/)[0];
  if (first === "P1" || first === "P2") return first;
  return upper;
}

interface RowResult {
  row: number;
  ok: boolean;
  reason?: string;
}

export function createImportService(
  repos: Repositories,
  blobStore: CrmJobBlobStore,
) {
  const audit = createAuditService(repos);

  async function processEstadoJob(
    jobId: number,
    filePath: string,
    actorId: number,
  ): Promise<{
    total: number;
    applied: number;
    failed: number;
    results: RowResult[];
  }> {
    const content = await blobStore.get(filePath);
    const text = new TextDecoder("utf-8").decode(content);
    const parsed = parseCsv(text);

    const headerError = validateHeaders(
      parsed.headers,
      ESTADO_COLUMNS,
      ESTADO_COLUMNS,
    );
    if (headerError) throw new Error(headerError);

    // Validate all rows synchronously — no DB calls in loop
    const valid: Array<{ row: number; ruc: string; estado: Estado }> = [];
    const results: RowResult[] = [];

    for (const row of parsed.rows) {
      const ruc = row.data["documento"] ?? "";
      const resultado = normalizeEstadoRaw(row.data["resultado"] ?? "");
      if (!/^\d+$/.test(ruc)) {
        results.push({ row: row.rowNumber, ok: false, reason: "Invalid RUC" });
        continue;
      }
      const estado = toEstado(resultado);
      if (!estado) {
        results.push({
          row: row.rowNumber,
          ok: false,
          reason: `Invalid resultado: ${resultado}`,
        });
        continue;
      }
      valid.push({ row: row.rowNumber, ruc, estado });
    }

    if (valid.length === 0) {
      return {
        total: parsed.rows.length,
        applied: 0,
        failed: parsed.rows.length,
        results,
      };
    }

    // One query to find all matching leads
    const leads = await repos.leads.findByRucInList(valid.map((v) => v.ruc));
    const leadMap = new Map(leads.map((l) => [l.ruc, l]));

    const found = valid.filter((v) => leadMap.has(v.ruc));
    const notFound = valid.filter((v) => !leadMap.has(v.ruc));

    for (const entry of notFound) {
      results.push({ row: entry.row, ok: false, reason: "RUC not found" });
    }

    // Concurrent updates — no sequential await-in-loop
    await Promise.all(
      found.map((entry) =>
        repos.leads.updateEstadoByRuc(entry.ruc, entry.estado),
      ),
    );

    // Single audit log for the batch
    if (found.length > 0) {
      await audit.log(
        actorId,
        "bulk_estado_update",
        "crm_integration_job",
        jobId,
        {
          applied: found.length,
          rucs: found.map((f) => f.ruc),
        },
      );
    }

    for (const entry of found) {
      results.push({ row: entry.row, ok: true });
    }

    return {
      total: parsed.rows.length,
      applied: found.length,
      failed: parsed.rows.length - found.length,
      results,
    };
  }

  async function processPrioridadJob(
    jobId: number,
    filePath: string,
    actorId: number,
  ): Promise<{
    total: number;
    applied: number;
    failed: number;
    results: RowResult[];
  }> {
    const content = await blobStore.get(filePath);
    const text = new TextDecoder("utf-8").decode(content);
    const parsed = parseCsv(text);

    const headerError = validateHeaders(
      parsed.headers,
      PRIORIDAD_COLUMNS,
      PRIORIDAD_COLUMNS,
    );
    if (headerError) throw new Error(headerError);

    // Validate all rows synchronously — no DB calls in loop
    const valid: Array<{ row: number; ruc: string; prioridad: Prioridad }> = [];
    const results: RowResult[] = [];

    for (const row of parsed.rows) {
      const ruc = row.data["documento"] ?? "";
      const prioridadRaw = normalizePrioridadRaw(row.data["prioridad"] ?? "");
      if (!/^\d+$/.test(ruc)) {
        results.push({ row: row.rowNumber, ok: false, reason: "Invalid RUC" });
        continue;
      }
      const prioridad = toPrioridad(prioridadRaw);
      if (!prioridad) {
        results.push({
          row: row.rowNumber,
          ok: false,
          reason: `Invalid prioridad: ${prioridadRaw}`,
        });
        continue;
      }
      valid.push({ row: row.rowNumber, ruc, prioridad });
    }

    if (valid.length === 0) {
      return {
        total: parsed.rows.length,
        applied: 0,
        failed: parsed.rows.length,
        results,
      };
    }

    // One query to find all matching leads
    const leads = await repos.leads.findByRucInList(valid.map((v) => v.ruc));
    const leadMap = new Map(leads.map((l) => [l.ruc, l]));

    const found = valid.filter((v) => leadMap.has(v.ruc));
    const notFound = valid.filter((v) => !leadMap.has(v.ruc));

    for (const entry of notFound) {
      results.push({ row: entry.row, ok: false, reason: "RUC not found" });
    }

    // Concurrent updates — no sequential await-in-loop
    await Promise.all(
      found.map((entry) =>
        repos.leads.updatePrioridadByRuc(entry.ruc, entry.prioridad),
      ),
    );

    // Single audit log for the batch
    if (found.length > 0) {
      await audit.log(
        actorId,
        "bulk_prioridad_update",
        "crm_integration_job",
        jobId,
        {
          applied: found.length,
          rucs: found.map((f) => f.ruc),
        },
      );
    }

    for (const entry of found) {
      results.push({ row: entry.row, ok: true });
    }

    return {
      total: parsed.rows.length,
      applied: found.length,
      failed: parsed.rows.length - found.length,
      results,
    };
  }

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
        if (!job || !job.file_path) continue;

        const runner =
          job.type === "import_estado" ? processEstadoJob : processPrioridadJob;
        try {
          // eslint-disable-next-line no-await-in-loop
          const result = await runner(id, job.file_path, job.user_id);
          // eslint-disable-next-line no-await-in-loop
          await repos.integrationJobs.markCompleted(id, {
            rowsTotal: result.total,
            rowsApplied: result.applied,
            rowsFailed: result.failed,
            resultsJson: JSON.stringify(result.results),
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
