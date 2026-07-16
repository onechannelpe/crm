import { onCleanup } from "solid-js";

import {
  getRecordImportJob,
  uploadRecordImportFile,
} from "~/actions/records/imports";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import {
  parseRecordImportProgressMessage,
  type RecordImportProgressEvent,
  type RecordImportType,
} from "~/features/records-imports/contracts";
import {
  createEventSourceStream,
  type EventSourceStream,
} from "~/lib/realtime/event-source-stream";
import { actionErrorMessage } from "~/lib/wire-error";

const IMPORT_PROGRESS_DURATION_MS = 0;
const IMPORT_COMPLETED_DURATION_MS = 4000;
const POLL_BASE_MS = 2_000;
const POLL_MAX_MS = 15_000;
const RECONNECT_JITTER_MS = 300;

type ImportSession = {
  jobId: string;
  toastId: string;
  importType: RecordImportType;
  stream: EventSourceStream | null;
  pollTimer: number | null;
  pollFailureCount: number;
};

function importTypeLabel(type: RecordImportType): string {
  if (type === "import_status") return "estados";
  return "prioridades";
}

function importTypeUnit(type: RecordImportType, count: number): string {
  if (type === "import_status") return count === 1 ? "estado" : "estados";
  return count === 1 ? "prioridad" : "prioridades";
}

function buildProgressMessage(event: {
  importType: RecordImportType;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
}): string {
  if (event.rowsTotal <= 0) {
    return `Procesando ${importTypeLabel(event.importType)}...`;
  }
  const processed = event.rowsApplied + event.rowsFailed;
  return `Procesando ${importTypeUnit(event.importType, event.rowsTotal)}: ${processed} de ${event.rowsTotal}`;
}

function buildCompletedMessage(event: {
  importType: RecordImportType;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
}): string {
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

function recordImportStreamUrl(jobId: string): string {
  return `/api/records/imports/${jobId}/stream`;
}

function withJitter(ms: number): number {
  return ms + Math.floor(Math.random() * (RECONNECT_JITTER_MS + 1));
}

export function useRecordsImport() {
  const { enqueueInfoSnackBar, enqueueErrorSnackBar, updateSnackBar } =
    useSnackBar();

  let fileInputRef: HTMLInputElement | undefined;
  let session: ImportSession | null = null;

  function stopSession(): void {
    if (!session) return;
    const s = session;
    session = null;
    if (s.pollTimer !== null) window.clearTimeout(s.pollTimer);
    s.stream?.disconnect();
  }

  function handleJobEvent(
    s: ImportSession,
    event: RecordImportProgressEvent,
  ): void {
    if (event.status === "COMPLETED") {
      updateSnackBar(s.toastId, {
        message: buildCompletedMessage(event),
        variant: event.rowsFailed > 0 ? "warning" : "success",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });
      stopSession();
      return;
    }

    if (event.status === "FAILED") {
      updateSnackBar(s.toastId, {
        message: event.errorMessage ?? "La importación falló",
        variant: "error",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });
      stopSession();
      return;
    }

    updateSnackBar(s.toastId, { message: buildProgressMessage(event) });
  }

  async function pollOnce(s: ImportSession): Promise<"ok" | "retry"> {
    try {
      const job = await getRecordImportJob(s.jobId);
      handleJobEvent(s, {
        type: "job_progress",
        jobId: s.jobId,
        importType: s.importType,
        status: job.status,
        rowsApplied: job.rows_applied ?? 0,
        rowsFailed: job.rows_failed ?? 0,
        rowsTotal: job.rows_total ?? 0,
        errorMessage: job.error_message ?? null,
      });
      return "ok";
    } catch {
      return "retry";
    }
  }

  function schedulePolling(s: ImportSession, delayMs: number): void {
    if (s.pollTimer !== null) window.clearTimeout(s.pollTimer);
    s.pollTimer = window.setTimeout(() => {
      void (async () => {
        if (session !== s) return;
        const result = await pollOnce(s);
        if (session !== s) return;
        if (result === "retry") {
          s.pollFailureCount++;
        } else {
          s.pollFailureCount = 0;
        }
        const delay = withJitter(
          Math.min(POLL_BASE_MS * 2 ** s.pollFailureCount, POLL_MAX_MS),
        );
        schedulePolling(s, delay);
      })();
    }, delayMs);
  }

  function connectStream(s: ImportSession): void {
    const stream = createEventSourceStream({
      onMessage: (raw) => {
        if (session !== s) return;
        const payload = parseRecordImportProgressMessage(raw);
        if (payload) handleJobEvent(s, payload);
      },
      // Poll only when EventSource never connects. Browsers reconnect dropped streams.
      onNeverConnected: () => {
        if (session !== s) return;
        schedulePolling(s, 0);
      },
    });
    s.stream = stream;
    stream.connect(recordImportStreamUrl(s.jobId));
  }

  async function importFile(file: File): Promise<void> {
    if (!isSupportedFile(file)) {
      enqueueErrorSnackBar("Solo se permiten archivos .csv o .xlsx");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    try {
      const result = await uploadRecordImportFile(formData);

      const toastId = enqueueInfoSnackBar(
        buildProgressMessage({
          importType: result.importType,
          rowsApplied: 0,
          rowsFailed: 0,
          rowsTotal: result.rowsTotal,
        }),
        { duration: IMPORT_PROGRESS_DURATION_MS },
      );

      stopSession();
      session = {
        jobId: result.jobId,
        toastId,
        importType: result.importType,
        stream: null,
        pollTimer: null,
        pollFailureCount: 0,
      };

      connectStream(session);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  function bindFileInput(el: HTMLInputElement) {
    fileInputRef = el;
  }

  function openFilePicker() {
    fileInputRef?.click();
  }

  function onFileInputChange(event: Event) {
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

  onCleanup(stopSession);

  return {
    bindFileInput,
    openFilePicker,
    onFileInputChange,
    importFile,
  };
}
