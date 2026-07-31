import { createEffect, createSignal, on } from "solid-js";

import { createTopicState } from "~/browser/realtime/create-topic-state";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { actionErrorMessage } from "~/contracts/errors";
import { REALTIME_CHANNELS } from "~/contracts/realtime/channel";
import {
  parseRecordImportProgressMessage,
  type RecordImportProgressEvent,
  type RecordImportType,
} from "~/contracts/records/imports";
import { uploadRecordImportFile } from "~/rpc/records/imports";

const IMPORT_PROGRESS_DURATION_MS = 0;
const IMPORT_COMPLETED_DURATION_MS = 4_000;

type ImportProgress = {
  importType: RecordImportType;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
};

function importTypeLabel(type: RecordImportType): string {
  if (type === "import_status") {
    return "estados";
  }

  return "prioridades";
}

function importTypeUnit(type: RecordImportType, count: number): string {
  if (type === "import_status") {
    return count === 1 ? "estado" : "estados";
  }

  return count === 1 ? "prioridad" : "prioridades";
}

function buildProgressMessage(event: ImportProgress): string {
  if (event.rowsTotal <= 0) {
    return `Procesando ${importTypeLabel(event.importType)}...`;
  }

  const processed = event.rowsApplied + event.rowsFailed;

  return `Procesando ${importTypeUnit(event.importType, event.rowsTotal)}: ${processed} de ${event.rowsTotal}`;
}

function buildCompletedMessage(event: ImportProgress): string {
  const unit = importTypeUnit(event.importType, event.rowsTotal);

  if (event.rowsFailed > 0) {
    return `Procesados ${event.rowsTotal} ${unit} (${event.rowsFailed} con error)`;
  }

  return `Procesados ${event.rowsTotal} ${unit}`;
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return name.endsWith(".csv") || name.endsWith(".xlsx");
}

function isTerminal(event: RecordImportProgressEvent): boolean {
  return event.queueState === "done" || event.queueState === "failed";
}

export function useRecordsImport() {
  const { enqueueInfoSnackBar, enqueueErrorSnackBar, updateSnackBar } =
    useSnackBar();

  let fileInputRef: HTMLInputElement | undefined;
  let snackBarId: string | null = null;

  const [jobId, setJobId] = createSignal<string | null>(null);

  const progress = createTopicState({
    channel: REALTIME_CHANNELS.recordImport,
    id: jobId,
    parse: parseRecordImportProgressMessage,
    isFinal: isTerminal,
  });

  function updateImportSnackBar(
    id: string,
    event: RecordImportProgressEvent,
  ): void {
    if (event.queueState === "done") {
      updateSnackBar(id, {
        message: buildCompletedMessage(event),
        variant: event.rowsFailed > 0 ? "warning" : "success",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });

      return;
    }

    if (event.queueState === "failed") {
      updateSnackBar(id, {
        message: event.errorMessage ?? "La importación falló",
        variant: "error",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });

      return;
    }

    updateSnackBar(id, {
      message: buildProgressMessage(event),
    });
  }

  createEffect(
    on(progress, (event) => {
      if (!event || snackBarId === null) {
        return;
      }

      updateImportSnackBar(snackBarId, event);
    }),
  );

  async function importFile(file: File): Promise<void> {
    if (!isSupportedFile(file)) {
      enqueueErrorSnackBar("Solo se permiten archivos .csv o .xlsx");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    try {
      const result = await uploadRecordImportFile(formData);

      snackBarId = enqueueInfoSnackBar(
        buildProgressMessage({
          importType: result.importType,
          rowsApplied: 0,
          rowsFailed: 0,
          rowsTotal: result.rowsTotal,
        }),
        { duration: IMPORT_PROGRESS_DURATION_MS },
      );

      setJobId(result.jobId);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  function bindFileInput(element: HTMLInputElement): void {
    fileInputRef = element;
  }

  function openFilePicker(): void {
    fileInputRef?.click();
  }

  function onFileInputChange(event: Event): void {
    const target = event.currentTarget;

    if (
      !(target instanceof HTMLInputElement) ||
      !target.files ||
      target.files.length === 0
    ) {
      return;
    }

    const file = target.files.item(0);

    if (file) {
      void importFile(file);
    }

    target.value = "";
  }

  return {
    bindFileInput,
    openFilePicker,
    onFileInputChange,
    importFile,
  };
}
