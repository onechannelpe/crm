import { describe, expect, it } from "vitest";

import type { ExecuteDownloadDeps } from "~/server/files/service/contracts";
import { executeDownload } from "~/server/files/service/execute-download";
import {
  asArtifactDownloadTokenId,
  asBranchId,
  asFileAssetId,
  asUserId,
  asWorkflowArtifactId,
} from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

describe("executeDownload", () => {
  it("returns conflict when token is consumed concurrently", async () => {
    const deps: ExecuteDownloadDeps = {
      repo: {
        tokens: {
          findByHash: async () => ({
            id: asArtifactDownloadTokenId("1"),
            artifactId: asWorkflowArtifactId("artifact-10"),
            fileAssetId: asFileAssetId("20"),
            requestedByUserId: asUserId("7"),
            expiresAt: new Date(2_000_000_000_000),
            usedAt: null,
          }),
          markUsed: async () => false,
          insert: async () => {},
        },
        artifacts: {
          findById: async () => ({
            id: asWorkflowArtifactId("artifact-10"),
            artifactType: "records_export",
            direction: "download",
            executionMode: "sync",
            status: "ready",
            requestedByUserId: asUserId("7"),
            scopeBranchId: asBranchId("1"),
            scopeTeamId: null,
            policySnapshotJson: "{}",
            workflowContextJson: "{}",
            errorCode: null,
            errorMessage: null,
            expiresAt: null,
            createdAt: new Date(1),
            updatedAt: new Date(1),
          }),
          insert: async () => asWorkflowArtifactId("unused"),
          updateStatus: async () => {},
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          findById: async () => ({
            id: asFileAssetId("20"),
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
            createdAt: new Date(1),
          }),
          insert: async () => asFileAssetId("1"),
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

    const result = await executeDownload(
      "token",
      deps,
      new Date(1_700_000_000_000),
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("token_already_used");
  });
});
