import { Buffer } from "node:buffer";

import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { DocumentBlobStore } from "./document-blob-store";

interface UploadDocumentInput {
  chargeNoteId: number;
  userId: number;
  originalName: string;
  mimeType: string;
  contentBase64: string;
}

function sanitizeFilename(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
  return sanitized.length > 0 ? sanitized : "document.bin";
}

function parseAllowedMimeTypes(raw: string | null) {
  if (!raw) {
    return [...config.uploads.allowedTypes];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...config.uploads.allowedTypes];
    }

    const mimeTypes = parsed.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    return mimeTypes.length > 0 ? mimeTypes : [...config.uploads.allowedTypes];
  } catch {
    return [...config.uploads.allowedTypes];
  }
}

function decodeBase64Payload(contentBase64: string) {
  try {
    return Buffer.from(contentBase64, "base64");
  } catch {
    return null;
  }
}

export function createSalesDocumentService(
  repos: Repositories,
  blobStore: DocumentBlobStore,
) {
  return {
    async upload(
      input: UploadDocumentInput,
    ): Promise<Result<{ documentId: number }, string>> {
      const content = decodeBase64Payload(input.contentBase64);
      if (!content || content.byteLength === 0) {
        return Err("Document content is required");
      }

      const policy = await repos.documents.findRetentionPolicy();
      const maxFileSizeBytes =
        policy?.max_file_size_bytes ??
        config.uploads.maxFileSizeMB * 1024 * 1024;
      if (content.byteLength > maxFileSizeBytes) {
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

      const blob = await blobStore.put(content);
      const inserted = await repos.documents.create({
        charge_note_id: input.chargeNoteId,
        original_name: sanitizeFilename(input.originalName),
        mime_type: input.mimeType,
        size_bytes: content.byteLength,
        sha256: blob.sha256,
        storage_key: blob.storageKey,
        created_by_user_id: input.userId,
      });

      return Ok({ documentId: inserted.id });
    },

    async runRetentionSweep(actorUserId: number | null = null) {
      const policy = await repos.documents.findRetentionPolicy();
      const retentionDays =
        policy?.retention_days ?? config.uploads.retentionDays;
      const hardDeleteEnabled =
        (policy?.hard_delete_enabled ?? config.uploads.hardDeleteEnabled) === 1;
      if (!hardDeleteEnabled) {
        return 0;
      }

      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const candidates = await repos.documents.findHardDeleteCandidates(cutoff);

      await Promise.all(
        candidates.map(async (candidate) => {
          await blobStore.deleteByStorageKey(candidate.storage_key);
          await repos.documents.markHardDeleted(candidate.id, actorUserId);
        }),
      );

      return candidates.length;
    },
  };
}
