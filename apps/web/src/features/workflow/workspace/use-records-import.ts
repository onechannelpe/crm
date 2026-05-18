import { onCleanup } from "solid-js";

import {
  getRecordImportJob,
  uploadRecordImportFile,
} from "~/actions/records/imports";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import {
  parseRecordImportProgressMessage,
  recordImportTopic,
  type RecordImportProgressEvent,
  type RecordImportType,
} from "~/features/records-imports/contracts";
import { getErrorMessage } from "~/lib/errors";
import { buildRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";

const IMPORT_PROGRESS_DURATION_MS = 0;
const IMPORT_COMPLETED_DURATION_MS = 4000;
const POLL_BASE_MS = 2_000;
const POLL_MAX_MS = 15_000;
const WS_RECONNECT_BASE_MS = 1_000;
const WS_RECONNECT_MAX_MS = 15_000;
const RECONNECT_JITTER_MS = 300;

type ImportSession = {
  jobId: string;
  toastId: string;
  importType: RecordImportType;
  socket: WebSocket | null;
  pollTimer: number | null;
  wsReconnectTimer: number | null;
  pollFailureCount: number;
  wsReconnectAttempt: number;
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

function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/records/imports/ws`;
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
    if (s.wsReconnectTimer !== null) window.clearTimeout(s.wsReconnectTimer);
    try {
      s.socket?.close();
    } catch {
      // no-op
    }
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

  function scheduleWsReconnect(s: ImportSession): void {
    if (s.wsReconnectTimer !== null) return;
    s.wsReconnectAttempt++;
    const retryExponent = Math.max(0, s.wsReconnectAttempt - 1);
    const delay = withJitter(
      Math.min(WS_RECONNECT_BASE_MS * 2 ** retryExponent, WS_RECONNECT_MAX_MS),
    );
    s.wsReconnectTimer = window.setTimeout(() => {
      if (session !== s) return;
      s.wsReconnectTimer = null;
      connectWebsocket(s);
    }, delay);
  }

  function connectWebsocket(s: ImportSession): void {
    try {
      s.socket?.close();
    } catch {
      // no-op
    }
    s.socket = null;

    const socket = new WebSocket(websocketUrl());
    s.socket = socket;

    socket.addEventListener("open", () => {
      s.wsReconnectAttempt = 0;
      socket.send(
        buildRealtimeSubscriptionMessage({
          type: "subscribe",
          topic: recordImportTopic(s.jobId),
        }),
      );
    });

    socket.addEventListener("message", (ev) => {
      if (session !== s) return;
      const payload = parseRecordImportProgressMessage(String(ev.data));
      if (payload) handleJobEvent(s, payload);
    });

    socket.addEventListener("close", () => {
      if (session !== s) return;
      schedulePolling(s, 0);
      scheduleWsReconnect(s);
    });

    socket.addEventListener("error", () => {
      if (session !== s) return;
      schedulePolling(s, 0);
      scheduleWsReconnect(s);
    });
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
        socket: null,
        pollTimer: null,
        wsReconnectTimer: null,
        pollFailureCount: 0,
        wsReconnectAttempt: 0,
      };

      schedulePolling(session, 0);
      connectWebsocket(session);
    } catch (error: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(error, "No se pudo importar el archivo"),
      );
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
