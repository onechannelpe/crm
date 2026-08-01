import type { DomainError } from "~/domain/errors";
import type { GpvSnapshotId, GpvSnapshotJobId, UserId } from "~/domain/ids";
import type { StoreFileDeps } from "~/server/files/service/contracts";
import { storeUploadedFile } from "~/server/files/service/store-uploaded-file";
import type { FileStorage } from "~/server/files/storage";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { Ok, type Result } from "~/shared/result";

import { acceptGpvSnapshot } from "./accept";

export interface SubmitGpvSnapshotInput {
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
  cutAt: Date;
  uploadedBy: UserId;
  now: Date;
}

export interface SubmitGpvSnapshotDeps {
  db: DatabaseExecutor;
  files: StoreFileDeps & { storage: FileStorage };
}

export interface SubmittedGpvSnapshot {
  snapshotId: GpvSnapshotId;
  jobId: GpvSnapshotJobId | null;
  cutAt: Date;
  duplicate: boolean;
}

export async function submitGpvSnapshot(
  input: SubmitGpvSnapshotInput,
  deps: SubmitGpvSnapshotDeps,
): Promise<Result<SubmittedGpvSnapshot, DomainError>> {
  const file = await storeUploadedFile(
    {
      actor: { userId: input.uploadedBy },
      operationAt: input.now,
    },
    {
      purpose: "merchant_gpv_snapshot",
      name: input.file.name,
      sizeBytes: input.file.sizeBytes,
      stream: input.file.stream,
    },
    deps.files,
  );
  if (!file.ok) {
    return file;
  }

  const accepted = await acceptGpvSnapshot(deps.db, {
    fileAssetId: file.value.id,
    contentSha256: file.value.sha256Hex,
    cutAt: input.cutAt,
    now: input.now,
  });

  if (accepted.kind === "duplicate") {
    await deps.files.repo.assets.delete(file.value.id);
    await deps.files.storage.delete(file.value.storageKey);
  }

  return Ok({
    snapshotId: accepted.snapshotId,
    jobId: accepted.kind === "accepted" ? accepted.jobId : null,
    cutAt: input.cutAt,
    duplicate: accepted.kind === "duplicate",
  });
}
