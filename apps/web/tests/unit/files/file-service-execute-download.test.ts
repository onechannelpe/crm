import { describe, expect, it } from "vitest";

import { executeDownload } from "~/server/files/service/execute-download";
import type { FileAsset } from "~/server/files/types";
import {
  asFileAssetId,
  asFileDownloadTokenId,
  asUserId,
} from "~/server/shared/ids";

const fileAsset: FileAsset = {
  id: asFileAssetId("file-20"),
  storageKey: "records_export/2026/07/export.csv",
  purpose: "records_export",
  originalFilename: "export.csv",
  safeDisplayFilename: "export.csv",
  detectedMime: "text/csv; charset=utf-8",
  extension: "csv",
  sizeBytes: 3,
  sha256Hex: "sha",
  signatureKind: "csv",
  scanStatus: "clean",
  scanEngine: null,
  scanReference: null,
  createdByUserId: asUserId("user-7"),
  createdAt: new Date(1),
};

describe("executeDownload", () => {
  it("returns conflict when concurrent consumption wins after the file is loaded", async () => {
    const result = await executeDownload(
      "token",
      {
        repo: {
          tokens: {
            findByHash: async () => ({
              id: asFileDownloadTokenId("token-1"),
              fileAssetId: fileAsset.id,
              requestedByUserId: asUserId("user-7"),
              expiresAt: new Date(2_000_000_000_000),
              usedAt: null,
            }),
            markUsed: async () => false,
            insert: async () => {},
          },
          assets: {
            findById: async () => fileAsset,
            insert: async () => fileAsset.id,
          },
        },
        storage: {
          putFromWebStream: async () => ({ sha256: "unused", sizeBytes: 0 }),
          putBytes: async () => ({ sha256: "unused", sizeBytes: 0 }),
          getBytes: async () => new TextEncoder().encode("csv"),
          delete: async () => {},
        },
      },
      new Date(1_700_000_000_000),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("token_already_used");
  });
});
