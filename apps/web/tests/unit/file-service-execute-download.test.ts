import { describe, expect, it } from "vitest";

import type { ExecuteDownloadDeps } from "../../src/server/files/service/contracts";
import { executeDownload } from "../../src/server/files/service/execute-download";
import { isErr } from "../../src/server/shared/result";

describe("executeDownload", () => {
  it("returns conflict when token is consumed concurrently", async () => {
    const deps: ExecuteDownloadDeps = {
      repo: {
        tokens: {
          findByHash: async () => ({
            id: 1,
            artifactId: "artifact-10",
            fileAssetId: 20,
            requestedByUserId: 7,
            expiresAt: 2_000_000_000_000,
            usedAt: null,
          }),
          markUsed: async () => false,
          insert: async () => {},
        },
        artifacts: {
          findById: async () => ({
            id: "artifact-10",
            artifactType: "records_export",
            direction: "download",
            executionMode: "sync",
            status: "ready",
            requestedByUserId: 7,
            scopeBranchId: 1,
            scopeTeamId: null,
            policySnapshotJson: "{}",
            workflowContextJson: "{}",
            errorCode: null,
            errorMessage: null,
            expiresAt: null,
            createdAt: 1,
            updatedAt: 1,
          }),
          insert: async () => "unused",
          updateStatus: async () => {},
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          findById: async () => ({
            id: 20,
            storageKey: "files/export.csv",
            originalFilename: "export.csv",
            safeDisplayFilename: "export.csv",
            detectedMime: "text/csv; charset=utf-8",
            extension: "csv",
            sizeBytes: 10,
            sha256Hex: "sha",
            signatureKind: "csv",
            scanStatus: "clean",
            scanEngine: null,
            scanReference: null,
            createdAt: 1,
          }),
          insert: async () => 1,
        },
        events: {
          insert: async () => {
            throw new Error("should not write event when token consume fails");
          },
          list: async () => [],
        },
      },

      storage: {
        putFromWebStream: async () => ({ sha256: "unused", sizeBytes: 0 }),
        putBytes: async () => ({ sha256: "unused", sizeBytes: 0 }),
        getBytes: async () => new TextEncoder().encode("csv"),
        delete: async () => {},
      },
    };

    const result = await executeDownload("token", deps, 1_700_000_000_000);

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("token_already_used");
  });
});
