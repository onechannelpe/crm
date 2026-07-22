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
  subscribeState,
  type StateSubscription,
} from "~/lib/realtime/subscribe-state";
import { actionErrorMessage } from "~/lib/wire-error";

import { revalidateGpvData } from "../revalidate";

type ImportPhase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "duplicate" }
  | { kind: "processing"; settled: number; total: number }
  | { kind: "done"; applied: number; failed: number; total: number }
  | { kind: "error"; message: string };

function isTerminal(event: MerchantReportProgressEvent): boolean {
  return event.queueState === "done" || event.queueState === "failed";
}

export function useReportImport() {
  const [phase, setPhase] = createSignal<ImportPhase>({ kind: "idle" });

  let subscription: StateSubscription | null = null;

  function stopSubscription(): void {
    subscription?.stop();
    subscription = null;
  }

  async function handleEvent(
    event: MerchantReportProgressEvent,
  ): Promise<void> {
    if (event.queueState === "done") {
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

  async function importFile(file: File, cutAt: string): Promise<void> {
    stopSubscription();
    setPhase({ kind: "uploading" });

    const form = new FormData();
    form.append("file", file);

    if (cutAt) {
      form.append("cutAt", new Date(cutAt).toISOString());
    }

    try {
      const { duplicate, importId } = await uploadMerchantReport(form);

      if (duplicate || !importId) {
        setPhase({ kind: "duplicate" });
        return;
      }

      setPhase({ kind: "processing", settled: 0, total: 0 });

      subscription = subscribeState({
        streamUrl: `/api/dashboards/imports/${importId}/stream`,
        parse: parseMerchantReportProgressMessage,
        fetchLatest: () => getMerchantReportProgress(importId),
        onEvent: (event) => void handleEvent(event),
        until: isTerminal,
      });
    } catch (caught: unknown) {
      setPhase({
        kind: "error",
        message: actionErrorMessage(caught),
      });
    }
  }

  onCleanup(stopSubscription);

  return { phase, importFile };
}
