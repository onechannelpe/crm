import { useAction, useNavigate, useSubmission } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { FileDropzone } from "~/components/ui/input/file-dropzone";
import { InputHint } from "~/components/ui/input/input-hint";
import { InputLabel } from "~/components/ui/input/input-label";
import { TextInput } from "~/components/ui/input/text-input";
import { actionErrorMessage } from "~/lib/wire-error";

import { uploadMerchantReportMutation } from "../data/mutations";

import styles from "./upload-report.module.css";

export function UploadReport() {
  const navigate = useNavigate();
  const upload = useAction(uploadMerchantReportMutation);
  const submission = useSubmission(uploadMerchantReportMutation);
  const [cutAt, setCutAt] = createSignal("");

  async function importFile(file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    if (cutAt()) {
      form.append("cutAt", cutAt());
    }

    try {
      const result = await upload(form);
      navigate(`/dashboards/merchant-gpv/imports/${result.snapshotId}`);
    } catch {
      // useSubmission exposes the action error below.
    }
  }

  return (
    <div class={styles.panel}>
      <FileDropzone
        accept=".xlsx"
        disabled={submission.pending}
        onFiles={(files) => {
          const file = files[0];
          if (file) {
            void importFile(file);
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
          disabled={submission.pending}
          onChange={setCutAt}
        />
        <InputHint>
          Se lee del nombre del archivo. Indícala solo si fue renombrado.
        </InputHint>
      </div>

      <Show when={submission.pending}>
        <p class={styles.status}>Subiendo archivo…</p>
      </Show>
      <Show when={submission.error}>
        {(error) => (
          <p class={styles.statusError}>{actionErrorMessage(error())}</p>
        )}
      </Show>
    </div>
  );
}
