import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import type { IngestJob } from "~/contracts/data-sources/ingest";
import { actionErrorMessage } from "~/contracts/errors";
import {
  getDataSourceUploadJob,
  registerDataSourceUpload,
} from "~/rpc/data-sources/ingest";

export type UploadRowPhase =
  | "idle"
  | "hashing"
  | "registering"
  | "uploading"
  | "polling"
  | "done"
  | "failed";

export interface UploadRow {
  id: string;
  file: File | null;
  sourceKey: string;
  snapshotLabel: string;
  snapshotDate: string;
  phase: UploadRowPhase;
  job: IngestJob | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 2000;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createRow(defaultSourceKey: string): UploadRow {
  return {
    id: crypto.randomUUID(),
    file: null,
    sourceKey: defaultSourceKey,
    snapshotLabel: "",
    snapshotDate: todayIsoDate(),
    phase: "idle",
    job: null,
    error: null,
  };
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// The blob step's Content-Length is set by the browser from the File body;
// fetch forbids setting it manually (unlike the server-to-engine hop, which
// signs and sends it itself because Bun's fetch has no such restriction).
async function uploadBlob(
  uploadId: string,
  file: File,
): Promise<{ jobId: string }> {
  const response = await fetch(
    `/api/data-sources/uploads/${encodeURIComponent(uploadId)}/blob`,
    { method: "PUT", body: file },
  );

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `upload failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

export function useDataSourceUpload() {
  // A store, not a signal-of-array: patching a field must mutate the row
  // in place. Replacing the array (or the row object) on every keystroke
  // gives <For> a new reference each time, so it tears down and rebuilds
  // the row's DOM — dropping input focus and, worse, silently clearing the
  // uncontrolled <input type=file> selection right after it's set.
  const [store, setStore] = createStore<{ rows: UploadRow[] }>({ rows: [] });
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const rows = () => store.rows;

  function patchRow(id: string, patch: Partial<UploadRow>): void {
    setStore("rows", (row) => row.id === id, patch);
  }

  function addRow(defaultSourceKey: string): void {
    setStore("rows", (current) => [...current, createRow(defaultSourceKey)]);
  }

  function removeRow(id: string): void {
    setStore("rows", (current) => current.filter((row) => row.id !== id));
  }

  function setFile(id: string, file: File | null): void {
    patchRow(id, { file });
  }

  function setSourceKey(id: string, sourceKey: string): void {
    patchRow(id, { sourceKey });
  }

  function setSnapshotLabel(id: string, snapshotLabel: string): void {
    patchRow(id, { snapshotLabel });
  }

  function setSnapshotDate(id: string, snapshotDate: string): void {
    patchRow(id, { snapshotDate });
  }

  async function pollJob(rowId: string, jobId: string): Promise<void> {
    for (;;) {
      // Each poll must see the previous one's result before deciding whether
      // to poll again, so this cannot be parallelized.
      // eslint-disable-next-line no-await-in-loop
      const job = await getDataSourceUploadJob(jobId);
      patchRow(rowId, {
        job,
        phase:
          job.outcome === "running"
            ? "polling"
            : job.outcome === "succeeded"
              ? "done"
              : "failed",
        error: job.outcome === "failed" ? job.error : null,
      });

      if (job.outcome !== "running") {
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  async function uploadRow(row: UploadRow): Promise<void> {
    if (!row.file) {
      return;
    }

    const file = row.file;

    try {
      patchRow(row.id, { phase: "hashing", error: null });
      const sha256 = await sha256Hex(file);

      patchRow(row.id, { phase: "registering" });
      const { uploadId } = await registerDataSourceUpload(
        row.sourceKey,
        row.snapshotLabel,
        row.snapshotDate,
        file.size,
        sha256,
      );

      patchRow(row.id, { phase: "uploading" });
      const { jobId } = await uploadBlob(uploadId, file);

      // Registration/upload stays sequential across rows (bandwidth-bound
      // anyway); polling for an already-queued job runs independently so
      // multiple rows finish processing concurrently.
      void pollJob(row.id, jobId);
    } catch (caught) {
      patchRow(row.id, { phase: "failed", error: actionErrorMessage(caught) });
    }
  }

  async function submitAll(): Promise<void> {
    setIsSubmitting(true);
    try {
      for (const row of rows()) {
        if (row.file && row.phase === "idle") {
          // Register/hash/upload is sequential across rows on purpose
          // (bandwidth-bound anyway); polling runs concurrently once a row
          // is queued, see pollJob.
          // eslint-disable-next-line no-await-in-loop
          await uploadRow(row);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    rows,
    isSubmitting,
    addRow,
    removeRow,
    setFile,
    setSourceKey,
    setSnapshotLabel,
    setSnapshotDate,
    submitAll,
  };
}
