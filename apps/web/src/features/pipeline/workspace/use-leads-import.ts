import { onCleanup } from "solid-js";

import {
  getLeadImportJob,
  uploadLeadImportFile,
} from "~/actions/leads/imports";
import { useToast } from "~/components/feedback/toast/provider";
import { getErrorMessage } from "~/lib/errors";

type ImportType = "import_status" | "import_prioridad";

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface LeadImportProgressMessage {
  type: "job_progress";
  jobId: number;
  importType: ImportType;
  status: JobStatus;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function importTypeLabel(type: ImportType): string {
  return type === "import_status" ? "estados" : "prioridades";
}

function buildProgressMessage(event: {
  importType: ImportType;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
}): string {
  const processed = event.rowsApplied + event.rowsFailed;
  return `Importando ${importTypeLabel(event.importType)}: ${processed}/${event.rowsTotal}`;
}

function buildCompletedMessage(event: {
  importType: ImportType;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
}): string {
  const processed = event.rowsApplied + event.rowsFailed;
  return `Importación de ${importTypeLabel(event.importType)} completada: ${processed}/${event.rowsTotal}`;
}

function parseProgressMessage(raw: string): LeadImportProgressMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isObjectRecord(parsed)) {
    return null;
  }

  const event = parsed;
  if (
    event.type !== "job_progress" ||
    (event.importType !== "import_status" &&
      event.importType !== "import_prioridad") ||
    (event.status !== "PENDING" &&
      event.status !== "PROCESSING" &&
      event.status !== "COMPLETED" &&
      event.status !== "FAILED") ||
    typeof event.jobId !== "number" ||
    typeof event.rowsApplied !== "number" ||
    typeof event.rowsFailed !== "number" ||
    typeof event.rowsTotal !== "number"
  ) {
    return null;
  }

  return {
    type: event.type,
    jobId: event.jobId,
    importType: event.importType,
    status: event.status,
    rowsApplied: event.rowsApplied,
    rowsFailed: event.rowsFailed,
    rowsTotal: event.rowsTotal,
    errorMessage:
      typeof event.errorMessage === "string" ? event.errorMessage : null,
  };
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
  let activeImportType: ImportType | null = null;
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
    importType: ImportType;
    rowsApplied: number;
    rowsFailed: number;
    rowsTotal: number;
  }) {
    if (progressToastId) {
      updateToast(progressToastId, {
        type: "success",
        message: buildCompletedMessage(event),
        duration: 3000,
        remaining: 3000,
      });
      progressToastId = null;
      return;
    }

    showToast("success", buildCompletedMessage(event), 3000);
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

  function handleProgressEvent(event: LeadImportProgressMessage) {
    if (event.jobId !== activeJobId || event.importType !== activeImportType) {
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
        JSON.stringify({
          type: "subscribe",
          jobId,
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const payload = parseProgressMessage(String(event.data));
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
        0,
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
