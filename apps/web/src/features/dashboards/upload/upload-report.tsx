import { createSignal, Match, Show, Switch } from "solid-js";

import { FileDropzone } from "~/components/ui/input/file-dropzone";
import { InputHint } from "~/components/ui/input/input-hint";
import { InputLabel } from "~/components/ui/input/input-label";
import { TextInput } from "~/components/ui/input/text-input";

import { formatInteger } from "../format";
import { useReportImport } from "./use-report-import";

import styles from "./upload-report.module.css";

export function UploadReport(props: { onClose?: () => void }) {
  const { phase, importFile } = useReportImport();
  const [cutAt, setCutAt] = createSignal("");

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

  return (
    <div class={styles.panel}>
      <FileDropzone
        accept=".xlsx"
        disabled={busy()}
        onFiles={(files) => {
          const file = files[0];

          if (file) {
            void importFile(file, cutAt());
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
                  : `Procesando ${formatInteger(current().settled)} de ${formatInteger(current().total)} filas...`}
              </p>

              <div class={styles.bar}>
                <div
                  class={styles.barFill}
                  style={{
                    width: `${
                      current().total
                        ? (current().settled / current().total) * 100
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
              Importado: {formatInteger(current().applied)} de{" "}
              {formatInteger(current().total)} filas aplicadas
              {current().failed > 0
                ? ` (${formatInteger(current().failed)} con error)`
                : ""}
              .
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
