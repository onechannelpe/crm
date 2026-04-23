import { onCleanup } from "solid-js";

import {
  getRecordImportJob,
  uploadRecordImportFile,
} from "~/actions/records/imports";
import { useToast } from "~/components/feedback/toast/provider";
import {
  recordImportTopic,
  parseRecordImportProgressMessage,
  type RecordImportType,
  type RecordImportProgressEvent,
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

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv");
}

function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/records/imports/ws`;
}

export function useRecordsImport() {
  const { showToast, updateToast, removeToast } = useToast();

  let fileInputRef: HTMLInputElement | undefined;
  let activeJobId: string | null = null;
  let activeImportType: RecordImportType | null = null;
  let progressToastId: string | null = null;
  let socket: WebSocket | null = null;
  let pollTimer: number | null = null;
  let wsReconnectTimer: number | null = null;
  let pollFailureCount = 0;
  let wsReconnectAttempt = 0;

  function withJitter(ms: number): number {
    const delta = Math.floor(Math.random() * (RECONNECT_JITTER_MS + 1));
    return ms + delta;
  }

  function pollDelayMs(): number {
    const exponential = Math.min(
      POLL_BASE_MS * 2 ** pollFailureCount,
      POLL_MAX_MS,
    );
    return withJitter(exponential);
  }

  function wsReconnectDelayMs(): number {
    const retryExponent = Math.max(0, wsReconnectAttempt - 1);
    const exponential = Math.min(
      WS_RECONNECT_BASE_MS * 2 ** retryExponent,
      WS_RECONNECT_MAX_MS,
    );
    return withJitter(exponential);
  }

  function clearPolling() {
    if (pollTimer !== null) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function clearWebsocketReconnect() {
    if (wsReconnectTimer !== null) {
      window.clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
  }

  function closeSocket() {
    if (socket) {
      try {
        socket.close();
      } catch {
        // no-op
      }
      socket = null;
    }
  }

  function finalizeProgressToast() {
    if (progressToastId) {
      removeToast(progressToastId);
      progressToastId = null;
    }
  }

  function completeProgressToast(event: {
    importType: RecordImportType;
    rowsApplied: number;
    rowsFailed: number;
    rowsTotal: number;
  }) {
    if (progressToastId) {
      updateToast(progressToastId, {
        type: event.rowsFailed > 0 ? "warning" : "success",
        message: buildCompletedMessage(event),
        duration: IMPORT_COMPLETED_DURATION_MS,
        remaining: IMPORT_COMPLETED_DURATION_MS,
      });
      progressToastId = null;
      return;
    }

    showToast(
      event.rowsFailed > 0 ? "warning" : "success",
      buildCompletedMessage(event),
      IMPORT_COMPLETED_DURATION_MS,
    );
  }

  function stopActiveTracking() {
    clearPolling();
    clearWebsocketReconnect();
    activeJobId = null;
    activeImportType = null;
    closeSocket();
    pollFailureCount = 0;
    wsReconnectAttempt = 0;
  }

  async function pollJobProgress(): Promise<"ok" | "retry"> {
    if (activeJobId === null || activeImportType === null) {
      return "ok";
    }

    try {
      const job = await getRecordImportJob(activeJobId);
      const rowsApplied = job.rows_applied ?? 0;
      const rowsFailed = job.rows_failed ?? 0;
      const rowsTotal = job.rows_total ?? 0;

      if (progressToastId) {
        updateToast(progressToastId, {
          message: buildProgressMessage({
            importType: activeImportType,
            rowsApplied,
            rowsFailed,
            rowsTotal,
          }),
        });
      }

      if (job.status === "COMPLETED") {
        completeProgressToast({
          importType: activeImportType,
          rowsApplied,
          rowsFailed,
          rowsTotal,
        });
        stopActiveTracking();
        return "ok";
      }

      if (job.status === "FAILED") {
        finalizeProgressToast();
        showToast("error", job.error_message ?? "La importación falló");
        stopActiveTracking();
        return "ok";
      }
      return "ok";
    } catch {
      // Keep polling. Transient failures should not break tracking.
      return "retry";
    }
  }

  function schedulePolling(delayMs: number) {
    clearPolling();
    pollTimer = window.setTimeout(() => {
      void (async () => {
        if (activeJobId === null) {
          return;
        }

        const result = await pollJobProgress();
        if (activeJobId === null) {
          return;
        }

        if (result === "retry") {
          pollFailureCount++;
        } else {
          pollFailureCount = 0;
        }

        schedulePolling(pollDelayMs());
      })();
    }, delayMs);
  }

  function startPolling() {
    schedulePolling(0);
  }

  function handleProgressEvent(event: RecordImportProgressEvent) {
    if (event.jobId !== activeJobId) {
      return;
    }

    if (progressToastId) {
      updateToast(progressToastId, {
        message: buildProgressMessage(event),
      });
    }

    if (event.status === "COMPLETED") {
      completeProgressToast({
        importType: event.importType,
        rowsApplied: event.rowsApplied,
        rowsFailed: event.rowsFailed,
        rowsTotal: event.rowsTotal,
      });
      stopActiveTracking();
      return;
    }

    if (event.status === "FAILED") {
      finalizeProgressToast();
      showToast("error", event.errorMessage ?? "La importación falló");
      stopActiveTracking();
    }
  }

  function scheduleWebsocketReconnect(jobId: string) {
    if (activeJobId !== jobId || wsReconnectTimer !== null) {
      return;
    }

    wsReconnectAttempt++;
    const delay = wsReconnectDelayMs();
    wsReconnectTimer = window.setTimeout(() => {
      wsReconnectTimer = null;
      if (activeJobId !== jobId) {
        return;
      }
      connectWebsocket(jobId);
    }, delay);
  }

  function connectWebsocket(jobId: string) {
    closeSocket();
    clearWebsocketReconnect();

    socket = new WebSocket(websocketUrl());
    socket.addEventListener("open", () => {
      wsReconnectAttempt = 0;
      clearPolling();
      socket?.send(
        buildRealtimeSubscriptionMessage({
          type: "subscribe",
          topic: recordImportTopic(jobId),
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const payload = parseRecordImportProgressMessage(String(event.data));
      if (!payload) {
        return;
      }
      handleProgressEvent(payload);
    });

    socket.addEventListener("close", () => {
      if (activeJobId !== null) {
        startPolling();
        scheduleWebsocketReconnect(jobId);
      }
    });

    socket.addEventListener("error", () => {
      if (activeJobId !== null) {
        startPolling();
        scheduleWebsocketReconnect(jobId);
      }
    });
  }

  async function importFile(file: File): Promise<void> {
    if (!isCsvFile(file)) {
      showToast("error", "Solo se permiten archivos .csv");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    try {
      const result = await uploadRecordImportFile(formData);

      activeJobId = result.jobId;
      activeImportType = result.importType;

      finalizeProgressToast();
      progressToastId = showToast(
        "info",
        buildProgressMessage({
          importType: result.importType,
          rowsApplied: 0,
          rowsFailed: 0,
          rowsTotal: result.rowsTotal,
        }),
        IMPORT_PROGRESS_DURATION_MS,
      );

      startPolling();
      connectWebsocket(result.jobId);
    } catch (error: unknown) {
      showToast(
        "error",
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

  onCleanup(() => {
    stopActiveTracking();
  });

  return {
    bindFileInput,
    openFilePicker,
    onFileInputChange,
    importFile,
  };
}
