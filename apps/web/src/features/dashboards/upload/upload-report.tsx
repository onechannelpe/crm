import { revalidate } from "@solidjs/router";
import { createSignal, Match, onCleanup, Show, Switch } from "solid-js";

import {
  getMerchantReportJob,
  uploadMerchantReport,
} from "~/actions/dashboards/imports";
import { FileDropzone } from "~/components/ui/input/file-dropzone";
import {
  accountRowsQuery,
  businessStatsOverviewQuery,
  cohortRowsQuery,
} from "~/lib/queries/dashboards";

import { formatInteger } from "../format";

import styles from "./upload-report.module.css";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "processing"; applied: number; total: number }
  | { kind: "done"; matched: number; total: number }
  | { kind: "error"; message: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function UploadReport(props: { onClose?: () => void }) {
  const [phase, setPhase] = createSignal<Phase>({ kind: "idle" });
  let cancelled = false;
  onCleanup(() => {
    cancelled = true;
  });

  async function refreshDashboards(): Promise<void> {
    await Promise.all([
      revalidate(businessStatsOverviewQuery.key),
      revalidate(cohortRowsQuery.key),
      revalidate(accountRowsQuery.key),
    ]);
  }

  async function handleFile(file: File): Promise<void> {
    setPhase({ kind: "uploading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const { jobId, rowsTotal } = await uploadMerchantReport(form);
      setPhase({ kind: "processing", applied: 0, total: rowsTotal });

      for (;;) {
        if (cancelled) return;
        const job = await getMerchantReportJob(jobId);
        if (job.status === "COMPLETED") {
          await refreshDashboards();
          setPhase({
            kind: "done",
            matched: job.rows_applied ?? 0,
            total: job.rows_total ?? rowsTotal,
          });
          return;
        }
        if (job.status === "FAILED") {
          setPhase({
            kind: "error",
            message: job.error_message ?? "La importación falló",
          });
          return;
        }
        setPhase({
          kind: "processing",
          applied: job.rows_applied ?? 0,
          total: job.rows_total ?? rowsTotal,
        });
        await sleep(1500);
      }
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof Error ? error.message : "Error al subir",
      });
    }
  }

  const busy = () =>
    phase().kind === "uploading" || phase().kind === "processing";

  return (
    <div class={styles.panel}>
      <FileDropzone
        accept=".xlsx"
        disabled={busy()}
        onFiles={(files) => {
          if (files[0]) void handleFile(files[0]);
        }}
      >
        {(state) => (
          <div
            class={styles.dropzone}
            classList={{ [styles.dragging]: state.dragging }}
          >
            <p class={styles.dropTitle}>
              Arrastra el reporte GPV (.xlsx) o haz clic para elegir
            </p>
            <p class={styles.dropHint}>
              Acepta el reporte del dealer o el archivo "GPV AL" con atribución.
            </p>
          </div>
        )}
      </FileDropzone>

      <Switch>
        <Match when={phase().kind === "uploading"}>
          <p class={styles.status}>Analizando archivo…</p>
        </Match>
        <Match when={phase().kind === "processing"}>
          {(_) => {
            const p = phase() as Extract<Phase, { kind: "processing" }>;
            return (
              <div>
                <p class={styles.status}>
                  Procesando {formatInteger(p.applied)} de{" "}
                  {formatInteger(p.total)} filas…
                </p>
                <div class={styles.bar}>
                  <div
                    class={styles.barFill}
                    style={{
                      width: `${p.total ? (p.applied / p.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          }}
        </Match>
        <Match when={phase().kind === "done"}>
          {(_) => {
            const p = phase() as Extract<Phase, { kind: "done" }>;
            return (
              <p class={styles.statusDone}>
                Importado: {formatInteger(p.matched)} de{" "}
                {formatInteger(p.total)} filas aplicadas.
              </p>
            );
          }}
        </Match>
        <Match when={phase().kind === "error"}>
          <p class={styles.statusError}>
            {(phase() as Extract<Phase, { kind: "error" }>).message}
          </p>
        </Match>
      </Switch>

      <Show when={props.onClose}>
        <button
          type="button"
          class={styles.close}
          disabled={busy()}
          onClick={() => props.onClose?.()}
        >
          Cerrar
        </button>
      </Show>
    </div>
  );
}
