import { createSignal, onCleanup } from "solid-js";

import {
  getMerchantReportProgress,
  uploadMerchantReport,
} from "~/actions/dashboards/imports";
import {
  parseMerchantReportProgressMessage,
  type MerchantReportProgressEvent,
} from "~/features/dashboards/imports/contracts";
import {
  createEventSourceStream,
  type EventSourceStream,
} from "~/lib/realtime/event-source-stream";
import { actionErrorMessage } from "~/lib/wire-error";

import { revalidateGpvData } from "../revalidate";

const POLL_BASE_MS = 2_000;
const POLL_MAX_MS = 15_000;
const RECONNECT_JITTER_MS = 300;

export type ImportPhase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "duplicate" }
  | { kind: "processing"; settled: number; total: number }
  | { kind: "done"; applied: number; failed: number; total: number }
  | { kind: "error"; message: string };

interface ImportSession {
  importId: string;
  stream: EventSourceStream | null;
  pollTimer: number | null;
  pollFailureCount: number;
}

function importStreamUrl(importId: string): string {
  return `/api/dashboards/imports/${importId}/stream`;
}

function withJitter(ms: number): number {
  return ms + Math.floor(Math.random() * (RECONNECT_JITTER_MS + 1));
}

export function useReportImport() {
  const [phase, setPhase] = createSignal<ImportPhase>({ kind: "idle" });

  let session: ImportSession | null = null;

  function stopSession(): void {
    if (!session) return;

    const current = session;
    session = null;

    if (current.pollTimer !== null) {
      window.clearTimeout(current.pollTimer);
    }

    current.stream?.disconnect();
  }

  async function handleEvent(
    event: MerchantReportProgressEvent,
  ): Promise<void> {
    if (event.queueState === "done") {
      stopSession();
      await revalidateGpvData();

      setPhase({
        kind: "done",
        applied: event.rowsApplied,
        failed: event.rowsFailed,
        total: event.rowsTotal,
      });

      return;
    }

    if (event.queueState === "failed") {
      stopSession();

      setPhase({
        kind: "error",
        message: event.errorMessage ?? "La importación falló",
      });

      return;
    }

    setPhase({
      kind: "processing",
      settled: event.rowsApplied + event.rowsFailed,
      total: event.rowsTotal,
    });
  }

  async function pollOnce(session: ImportSession): Promise<"ok" | "retry"> {
    try {
      await handleEvent(await getMerchantReportProgress(session.importId));

      return "ok";
    } catch {
      return "retry";
    }
  }

  function schedulePolling(current: ImportSession, delayMs: number): void {
    if (current.pollTimer !== null) {
      window.clearTimeout(current.pollTimer);
    }

    current.pollTimer = window.setTimeout(() => {
      void (async () => {
        if (session !== current) return;

        const result = await pollOnce(current);

        if (session !== current) return;

        current.pollFailureCount =
          result === "retry" ? current.pollFailureCount + 1 : 0;

        schedulePolling(
          current,
          withJitter(
            Math.min(POLL_BASE_MS * 2 ** current.pollFailureCount, POLL_MAX_MS),
          ),
        );
      })();
    }, delayMs);
  }

  function connectStream(current: ImportSession): void {
    const stream = createEventSourceStream({
      onMessage: (raw) => {
        if (session !== current) return;

        const payload = parseMerchantReportProgressMessage(raw);

        if (payload) {
          void handleEvent(payload);
        }
      },
      // EventSource reconnects dropped streams. Polling is only the fallback
      // when the initial connection never succeeds.
      onNeverConnected: () => {
        if (session !== current) return;

        schedulePolling(current, 0);
      },
    });

    current.stream = stream;
    stream.connect(importStreamUrl(current.importId));
  }

  async function importFile(file: File, cutAt: string): Promise<void> {
    stopSession();
    setPhase({ kind: "uploading" });

    const form = new FormData();
    form.append("file", file);

    if (cutAt) {
      form.append("cutAt", new Date(cutAt).toISOString());
    }

    try {
      const upload = await uploadMerchantReport(form);

      if (upload.duplicate || !upload.importId) {
        setPhase({ kind: "duplicate" });
        return;
      }

      setPhase({ kind: "processing", settled: 0, total: 0 });

      session = {
        importId: upload.importId,
        stream: null,
        pollTimer: null,
        pollFailureCount: 0,
      };

      connectStream(session);
    } catch (caught: unknown) {
      setPhase({
        kind: "error",
        message: actionErrorMessage(caught),
      });
    }
  }

  onCleanup(stopSession);

  return { phase, importFile };
}
