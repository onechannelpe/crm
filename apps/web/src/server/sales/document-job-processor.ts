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
  async function processLeasedJob(
    job: Awaited<
      ReturnType<Repositories["documentJobs"]["leasePending"]>
    >[number],
  ) {
    try {
      if (job.operation === "persist_upload") {
        const payloadBytes = toUint8Array(job.payload_bytes);
        if (!job.document_id || !payloadBytes) {
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
        await repos.documentJobs.markCompleted(job.id);
        return true;
      }

      await repos.documents.deleteBlobIfUnreferencedWithFile(
        job.blob_sha256,
        async (storageKey) => blobStore.deleteByStorageKey(storageKey),
      );
      await repos.documentJobs.markCompleted(job.id);
      return true;
    } catch (error) {
      try {
        if (job.document_id) {
          await repos.documents.markUploadFailedAndRelease(
            job.document_id,
            null,
          );
        }
      } catch (releaseError) {
        if (!isSqliteBusy(releaseError)) {
          throw releaseError;
        }
      }
      try {
        await repos.documentJobs.markFailedOrRetry(
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

  return {
    async runBatch(limit: number, leaseMs: number) {
      const leased = await repos.documentJobs.leasePending(limit, leaseMs);
      const settled = await Promise.all(
        leased.map((job) => processLeasedJob(job)),
      );
      return settled.filter(Boolean).length;
    },
  };
}
