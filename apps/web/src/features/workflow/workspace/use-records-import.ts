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
const IMPORT_COMPLETED_DURATION_MS = 4_000;
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
  if (type === "import_status") {
    return count === 1 ? "estado" : "estados";
  }

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

  function stopSession(expectedSession?: ImportSession): void {
    if (!session || (expectedSession && session !== expectedSession)) {
      return;
    }

    const activeSession = session;
    session = null;

    if (activeSession.pollTimer !== null) {
      window.clearTimeout(activeSession.pollTimer);
    }

    activeSession.stream?.disconnect();
  }

  function handleJobEvent(
    currentSession: ImportSession,
    event: RecordImportProgressEvent,
  ): void {
    if (session !== currentSession) {
      return;
    }

    if (event.queueState === "done") {
      updateSnackBar(currentSession.toastId, {
        message: buildCompletedMessage(event),
        variant: event.rowsFailed > 0 ? "warning" : "success",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });

      stopSession(currentSession);
      return;
    }

    if (event.queueState === "failed") {
      updateSnackBar(currentSession.toastId, {
        message: event.errorMessage ?? "La importación falló",
        variant: "error",
        duration: IMPORT_COMPLETED_DURATION_MS,
      });

      stopSession(currentSession);
      return;
    }

    updateSnackBar(currentSession.toastId, {
      message: buildProgressMessage(event),
    });
  }

  async function pollOnce(
    currentSession: ImportSession,
  ): Promise<"ok" | "retry" | "stale"> {
    try {
      const job = await getRecordImportJob(currentSession.jobId);

      if (session !== currentSession) {
        return "stale";
      }

      handleJobEvent(currentSession, {
        type: "job_progress",
        jobId: currentSession.jobId,
        importType: currentSession.importType,
        queueState: job.queue_state,
        rowsApplied: job.rows_applied ?? 0,
        rowsFailed: job.rows_failed ?? 0,
        rowsTotal: job.rows_total ?? 0,
        errorMessage: job.error_message ?? null,
      });

      return "ok";
    } catch {
      return session === currentSession ? "retry" : "stale";
    }
  }

  function schedulePolling(
    currentSession: ImportSession,
    delayMs: number,
  ): void {
    if (currentSession.pollTimer !== null) {
      window.clearTimeout(currentSession.pollTimer);
    }

    currentSession.pollTimer = window.setTimeout(() => {
      void (async () => {
        if (session !== currentSession) {
          return;
        }

        const result = await pollOnce(currentSession);

        if (result === "stale" || session !== currentSession) {
          return;
        }

        if (result === "retry") {
          currentSession.pollFailureCount++;
        } else {
          currentSession.pollFailureCount = 0;
        }

        const delay = withJitter(
          Math.min(
            POLL_BASE_MS * 2 ** currentSession.pollFailureCount,
            POLL_MAX_MS,
          ),
        );

        schedulePolling(currentSession, delay);
      })();
    }, delayMs);
  }

  function connectStream(currentSession: ImportSession): void {
    const stream = createEventSourceStream({
      onMessage: (raw) => {
        if (session !== currentSession) {
          return;
        }

        const event = parseRecordImportProgressMessage(raw);

        if (event) {
          handleJobEvent(currentSession, event);
        }
      },
      // EventSource reconnects dropped streams; polling handles initial failure.
      onNeverConnected: () => {
        if (session !== currentSession) {
          return;
        }

        schedulePolling(currentSession, 0);
      },
    });

    currentSession.stream = stream;
    stream.connect(recordImportStreamUrl(currentSession.jobId));
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

      const currentSession: ImportSession = {
        jobId: result.jobId,
        toastId,
        importType: result.importType,
        stream: null,
        pollTimer: null,
        pollFailureCount: 0,
      };

      session = currentSession;
      connectStream(currentSession);
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

  onCleanup(stopSession);

  return {
    bindFileInput,
    openFilePicker,
    onFileInputChange,
    importFile,
  };
}
