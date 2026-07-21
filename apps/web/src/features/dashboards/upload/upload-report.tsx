import { createSignal, Match, onCleanup, Show, Switch } from "solid-js";

import {
  getMerchantReportImport,
  uploadMerchantReport,
} from "~/actions/dashboards/imports";
import { FileDropzone } from "~/components/ui/input/file-dropzone";
import { InputHint } from "~/components/ui/input/input-hint";
import { InputLabel } from "~/components/ui/input/input-label";
import { TextInput } from "~/components/ui/input/text-input";

import { formatInteger } from "../format";
import { revalidateGpvData } from "../revalidate";

import styles from "./upload-report.module.css";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "duplicate" }
  | { kind: "processing"; applied: number; total: number }
  | { kind: "done"; matched: number; total: number }
  | { kind: "error"; message: string };

const POLL_INTERVAL_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function UploadReport(props: { onClose?: () => void }) {
  const [phase, setPhase] = createSignal<Phase>({ kind: "idle" });
  const [cutAt, setCutAt] = createSignal("");

  let cancelled = false;

  onCleanup(() => {
    cancelled = true;
  });

  const processing = () => {
    const current = phase();
    return current.kind === "processing" ? current : null;
  };

  const done = () => {
    const current = phase();
    return current.kind === "done" ? current : null;
  };

  const error = () => {
    const current = phase();
    return current.kind === "error" ? current : null;
  };

  const busy = () => {
    const current = phase();
    return current.kind === "uploading" || current.kind === "processing";
  };

  async function handleFile(file: File): Promise<void> {
    setPhase({ kind: "uploading" });

    try {
      const form = new FormData();
      form.append("file", file);

      if (cutAt()) {
        form.append("cutAt", new Date(cutAt()).toISOString());
      }

      const upload = await uploadMerchantReport(form);

      if (upload.duplicate || !upload.importId) {
        setPhase({ kind: "duplicate" });
        return;
      }

      setPhase({ kind: "processing", applied: 0, total: 0 });

      for (;;) {
        if (cancelled) {
          return;
        }

        // eslint-disable-next-line no-await-in-loop
        const job = await getMerchantReportImport(upload.importId);

        switch (job.queue_state) {
          case "done":
            // eslint-disable-next-line no-await-in-loop
            await revalidateGpvData();

            setPhase({
              kind: "done",
              matched: job.rows_applied ?? 0,
              total: job.rows_total ?? 0,
            });

            return;

          case "failed":
            setPhase({
              kind: "error",
              message: job.error_message ?? "La importación falló",
            });

            return;

          default:
            setPhase({
              kind: "processing",
              applied: job.rows_applied ?? 0,
              total: job.rows_total ?? 0,
            });

            // eslint-disable-next-line no-await-in-loop
            await sleep(POLL_INTERVAL_MS);
        }
      }
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Error al subir",
      });
    }
  }

  return (
    <div class={styles.panel}>
      <FileDropzone
        accept=".xlsx"
        disabled={busy()}
        onFiles={(files) => {
          if (files[0]) {
            void handleFile(files[0]);
          }
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
              El reporte del dealer, tal como sale del sistema de Culqi.
            </p>
          </div>
        )}
      </FileDropzone>

      <div class={styles.cutField}>
        <InputLabel for="gpv-cut-at">Fecha de corte</InputLabel>

        <TextInput
          id="gpv-cut-at"
          type="datetime-local"
          value={cutAt()}
          disabled={busy()}
          onChange={setCutAt}
        />

        <InputHint>
          Se lee del nombre del archivo. Indícala solo si fue renombrado.
        </InputHint>
      </div>

      <Switch>
        <Match when={phase().kind === "uploading"}>
          <p class={styles.status}>Subiendo archivo…</p>
        </Match>

        <Match when={phase().kind === "duplicate"}>
          <p class={styles.statusDone}>
            Este archivo ya se importó. No se cambió nada.
          </p>
        </Match>

        <Match when={processing()}>
          {(current) => (
            <div>
              <p class={styles.status}>
                {current().total === 0
                  ? "Leyendo el archivo…"
                  : `Procesando ${formatInteger(current().applied)} de ${formatInteger(current().total)} filas...`}
              </p>

              <div class={styles.bar}>
                <div
                  class={styles.barFill}
                  style={{
                    width: `${
                      current().total
                        ? (current().applied / current().total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </Match>

        <Match when={done()}>
          {(current) => (
            <p class={styles.statusDone}>
              Importado: {formatInteger(current().matched)} de{" "}
              {formatInteger(current().total)} filas aplicadas.
            </p>
          )}
        </Match>

        <Match when={error()}>
          {(current) => <p class={styles.statusError}>{current().message}</p>}
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
