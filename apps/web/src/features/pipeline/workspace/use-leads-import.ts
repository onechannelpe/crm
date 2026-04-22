import { onCleanup } from "solid-js";

import {
  getLeadImportJob,
  uploadLeadImportFile,
} from "~/actions/leads/imports";
import { useToast } from "~/components/feedback/toast/provider";
import {
  leadImportTopic,
  parseLeadImportProgressMessage,
  type LeadImportType,
  type LeadImportProgressEvent,
} from "~/features/leads-imports/contracts";
import { getErrorMessage } from "~/lib/errors";
import { buildRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";

const IMPORT_PROGRESS_DURATION_MS = 0;
const IMPORT_COMPLETED_DURATION_MS = 4000;

function importTypeLabel(type: LeadImportType): string {
  if (type === "import_status") {
    return "estados";
  }
  return "prioridades";
}

function importTypeUnit(type: LeadImportType, count: number): string {
  if (type === "import_status") {
    return count === 1 ? "estado" : "estados";
  }
  return count === 1 ? "prioridad" : "prioridades";
}

function buildProgressMessage(event: {
  importType: LeadImportType;
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
  importType: LeadImportType;
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
  return `${protocol}//${window.location.host}/api/leads/imports/ws`;
}

export function useLeadsImport() {
  const { showToast, updateToast, removeToast } = useToast();

  let fileInputRef: HTMLInputElement | undefined;
  let activeJobId: number | null = null;
  let activeImportType: LeadImportType | null = null;
  let progressToastId: string | null = null;
  let socket: WebSocket | null = null;
  let pollTimer: number | null = null;

  function clearPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
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
    importType: LeadImportType;
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
    closeSocket();
    activeJobId = null;
    activeImportType = null;
  }

  async function pollJobProgress(): Promise<void> {
    if (activeJobId === null || activeImportType === null) {
      return;
    }

    try {
      const job = await getLeadImportJob(activeJobId);
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
        return;
      }

      if (job.status === "FAILED") {
        finalizeProgressToast();
        showToast("error", job.error_message ?? "La importación falló");
        stopActiveTracking();
      }
    } catch {
      // Keep polling. Transient failures should not break tracking.
    }
  }

  function startPolling() {
    clearPolling();
    pollTimer = window.setInterval(() => {
      void pollJobProgress();
    }, 2_000);
  }

  function handleProgressEvent(event: LeadImportProgressEvent) {
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

  function connectWebsocket(jobId: number) {
    closeSocket();

    socket = new WebSocket(websocketUrl());
    socket.addEventListener("open", () => {
      clearPolling();
      socket?.send(
        buildRealtimeSubscriptionMessage({
          type: "subscribe",
          topic: leadImportTopic(jobId),
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const payload = parseLeadImportProgressMessage(String(event.data));
      if (!payload) {
        return;
      }
      handleProgressEvent(payload);
    });

    socket.addEventListener("close", () => {
      if (activeJobId !== null) {
        startPolling();
      }
    });

    socket.addEventListener("error", () => {
      if (activeJobId !== null) {
        startPolling();
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
      const result = await uploadLeadImportFile(formData);

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
