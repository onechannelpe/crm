import type { Repositories } from "~/server/shared/registry";

import type { DocumentBlobStore } from "./document-blob-store";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown document job error";
}

function isSqliteBusy(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("SQLITE_BUSY")
  );
}

function toUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    const view = value;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  return null;
}

export function createDocumentJobProcessor(
  repos: Repositories,
  blobStore: DocumentBlobStore,
) {
  async function processUploadJob(
    job: Awaited<
      ReturnType<Repositories["documentJobs"]["leasePendingUploadJobs"]>
    >[number],
  ) {
    try {
      const payloadBytes = toUint8Array(job.payload_bytes);
      if (!payloadBytes) {
        throw new Error("Invalid persist_upload job payload");
      }
      await blobStore.put(payloadBytes);
      const finalized = await repos.documents.markUploadedAvailable(
        job.document_id,
        null,
      );
      if (!finalized) {
        throw new Error("Could not finalize pending upload");
      }
      await repos.documentJobs.markUploadCompleted(job.id);
      return true;
    } catch (error) {
      try {
        await repos.documents.markUploadFailedAndRelease(job.document_id, null);
      } catch (releaseError) {
        if (!isSqliteBusy(releaseError)) {
          throw releaseError;
        }
      }
      try {
        await repos.documentJobs.markUploadFailedOrRetry(
          job.id,
          toErrorMessage(error),
        );
      } catch (retryError) {
        if (!isSqliteBusy(retryError)) {
          throw retryError;
        }
      }
      return false;
    }
  }

  async function processBlobGcJob(
    job: Awaited<
      ReturnType<Repositories["documentJobs"]["leaseBlobGc"]>
    >[number],
  ) {
    try {
      const deleted = await repos.documents.deleteBlobIfUnreferencedWithFile(
        job.blob_sha256,
        async (storageKey) => blobStore.deleteByStorageKey(storageKey),
      );
      if (!deleted) {
        await repos.documentJobs.markBlobGcIdle(
          job.blob_sha256,
          job.generation,
        );
        return false;
      }
      await repos.documentJobs.markBlobGcDone(job.blob_sha256, job.generation);
      return true;
    } catch (error) {
      try {
        await repos.documentJobs.markBlobGcRetryOrDead(
          job.blob_sha256,
          job.generation,
          toErrorMessage(error),
        );
      } catch (retryError) {
        if (!isSqliteBusy(retryError)) {
          throw retryError;
        }
      }
      return false;
    }
  }

  return {
    async runBatch(limit: number, leaseMs: number) {
      const [leasedUploads, leasedBlobGc] = await Promise.all([
        repos.documentJobs.leasePendingUploadJobs(limit, leaseMs),
        repos.documentJobs.leaseBlobGc(limit, leaseMs),
      ]);
      const [uploadSettled, deleteSettled] = await Promise.all([
        Promise.all(leasedUploads.map((job) => processUploadJob(job))),
        Promise.all(leasedBlobGc.map((job) => processBlobGcJob(job))),
      ]);
      const settled = [...uploadSettled, ...deleteSettled];
      return settled.filter(Boolean).length;
    },

    async runDeleteJobs(limit: number, leaseMs: number) {
      const leasedBlobGc = await repos.documentJobs.leaseBlobGc(limit, leaseMs);
      const settled = await Promise.all(
        leasedBlobGc.map((job) => processBlobGcJob(job)),
      );
      return settled.filter(Boolean).length;
    },
  };
}
