import { DEFAULT_UPLOAD_POLICY } from "~/lib/uploads/policy-defaults";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { DocumentBlobStore } from "./document-blob-store";

interface UploadDocumentInput {
  chargeNoteId: number;
  userId: number;
  originalName: string;
  mimeType: string;
  contentBytes: Uint8Array;
}

function sanitizeFilename(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  return sanitized.length > 0 ? sanitized : "document.bin";
}

function parseAllowedMimeTypes(raw: string | null) {
  if (!raw) {
    return [...DEFAULT_UPLOAD_POLICY.allowedMimeTypes];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_UPLOAD_POLICY.allowedMimeTypes];
    }

    const mimeTypes = parsed.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    return mimeTypes.length > 0
      ? mimeTypes
      : [...DEFAULT_UPLOAD_POLICY.allowedMimeTypes];
  } catch {
    return [...DEFAULT_UPLOAD_POLICY.allowedMimeTypes];
  }
}

function detectMimeTypeFromContent(content: Uint8Array): string | null {
  if (content.byteLength >= 5) {
    const isPdf =
      content[0] === 0x25 &&
      content[1] === 0x50 &&
      content[2] === 0x44 &&
      content[3] === 0x46 &&
      content[4] === 0x2d;
    if (isPdf) {
      return "application/pdf";
    }
  }

  if (content.byteLength >= 8) {
    const isPng =
      content[0] === 0x89 &&
      content[1] === 0x50 &&
      content[2] === 0x4e &&
      content[3] === 0x47 &&
      content[4] === 0x0d &&
      content[5] === 0x0a &&
      content[6] === 0x1a &&
      content[7] === 0x0a;
    if (isPng) {
      return "image/png";
    }
  }

  if (content.byteLength >= 3) {
    const isJpeg =
      content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
    if (isJpeg) {
      return "image/jpeg";
    }
  }

  if (content.byteLength >= 12) {
    const isWebp =
      content[0] === 0x52 &&
      content[1] === 0x49 &&
      content[2] === 0x46 &&
      content[3] === 0x46 &&
      content[8] === 0x57 &&
      content[9] === 0x45 &&
      content[10] === 0x42 &&
      content[11] === 0x50;
    if (isWebp) {
      return "image/webp";
    }
  }

  return null;
}

export function createSalesDocumentService(
  repos: Repositories,
  blobStore: DocumentBlobStore,
) {
  return {
    async upload(
      input: UploadDocumentInput,
    ): Promise<Result<{ documentId: number }, string>> {
      if (input.contentBytes.byteLength === 0) {
        return Err("Document content is required");
      }

      const policy = await repos.documents.findRetentionPolicy();
      const maxFileSizeBytes =
        policy?.max_file_size_bytes ?? DEFAULT_UPLOAD_POLICY.maxFileSizeBytes;
      if (input.contentBytes.byteLength > maxFileSizeBytes) {
        return Err(
          `File too large. Max ${Math.floor(maxFileSizeBytes / (1024 * 1024))} MB`,
        );
      }

      const allowedMimeTypes = parseAllowedMimeTypes(
        policy?.allowed_mime_types_json ?? null,
      );
      const isAllowedMimeType = allowedMimeTypes.some(
        (allowed) => allowed === input.mimeType,
      );
      if (!isAllowedMimeType) {
        return Err("File type not allowed");
      }

      const detectedMimeType = detectMimeTypeFromContent(input.contentBytes);
      if (!detectedMimeType || detectedMimeType !== input.mimeType) {
        return Err("File content does not match declared MIME type");
      }

      const prepared = blobStore.prepare(input.contentBytes);
      const inserted = await repos.documents.createPendingUpload({
        charge_note_id: input.chargeNoteId,
        original_name: sanitizeFilename(input.originalName),
        mime_type: input.mimeType,
        size_bytes: input.contentBytes.byteLength,
        sha256: prepared.sha256,
        storage_key: prepared.storageKey,
        created_by_user_id: input.userId,
      });
      try {
        await blobStore.put(input.contentBytes);
        const finalized = await repos.documents.markUploadedAvailable(
          inserted.id,
          input.userId,
        );
        if (!finalized) {
          await repos.documents.markUploadFailedAndRelease(
            inserted.id,
            input.userId,
          );
          return Err("Document upload could not be finalized");
        }

        return Ok({ documentId: inserted.id });
      } catch {
        await repos.documents.markUploadFailedAndRelease(
          inserted.id,
          input.userId,
        );
        return Err("Failed to persist document content");
      }
    },

    async runRetentionSweep(actorUserId: number | null = null) {
      const policy = await repos.documents.findRetentionPolicy();
      const retentionDays =
        policy?.retention_days ?? DEFAULT_UPLOAD_POLICY.retentionDays;
      const hardDeleteEnabled =
        (policy?.hard_delete_enabled ??
          DEFAULT_UPLOAD_POLICY.hardDeleteEnabled) === 1;
      if (!hardDeleteEnabled) {
        return 0;
      }

      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const candidates = await repos.documents.findHardDeleteCandidates(cutoff);
      let deletedCount = 0;
      for (const candidate of candidates) {
        // Process in-order to keep reference-count updates deterministic.
        // eslint-disable-next-line no-await-in-loop
        const released = await repos.documents.releaseForHardDelete(
          candidate.id,
          actorUserId,
        );
        if (!released) {
          continue;
        }
        if (released.shouldDeleteBlob) {
          // eslint-disable-next-line no-await-in-loop
          await repos.documents.deleteBlobIfUnreferencedWithFile(
            released.blobSha256,
            async (storageKey) => blobStore.deleteByStorageKey(storageKey),
          );
        }
        deletedCount += 1;
      }

      const unreferenced = await repos.documents.listUnreferencedBlobs(200);
      await Promise.all(
        unreferenced.map(async (blob) => {
          await repos.documents.deleteBlobIfUnreferencedWithFile(
            blob.sha256,
            async (storageKey) => blobStore.deleteByStorageKey(storageKey),
          );
        }),
      );

      return deletedCount;
    },

    async runIntegritySweep(
      batchSize: number,
      actorUserId: number | null = null,
    ) {
      let afterId = 0;
      let quarantinedCount = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const batch = await repos.documents.listAvailableForIntegrityScan(
          afterId,
          batchSize,
        );
        if (batch.length < 1) {
          break;
        }

        // eslint-disable-next-line no-await-in-loop
        const quarantined = await Promise.all(
          batch.map(async (document) => {
            const exists = await blobStore.existsByStorageKey(
              document.storage_key,
            );
            if (!exists) {
              return repos.documents.markMissingBlobIntegrity(
                document.id,
                actorUserId,
              );
            }
            return false;
          }),
        );
        quarantinedCount += quarantined.filter(Boolean).length;

        const last = batch[batch.length - 1];
        if (!last) {
          break;
        }
        afterId = last.id;
      }

      return quarantinedCount;
    },
  };
}
