import { describe, expect, it } from "vitest";

import type { DownloadTokenDeps } from "../../src/server/files/service/contracts";
import { requestDownloadToken } from "../../src/server/files/service/request-download-token";
import type { FileAsset, WorkflowArtifact } from "../../src/server/files/types";
import type { AppContext } from "../../src/server/shared/action-runtime";
import { isErr } from "../../src/server/shared/result";

function makeContext(overrides?: Partial<AppContext>): AppContext {
  return {
    actor: {
      id: "sess-1",
      userId: 10,
      branchId: 1,
      role: "back_office",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    requestId: "req-1",
    traceId: "trace-1",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    publicOrigin: "http://localhost:3000",
    now: () => 1_700_000_000_000,
    ...overrides,
  };
}

function makeArtifact(overrides?: Partial<WorkflowArtifact>): WorkflowArtifact {
  return {
    id: "artifact-42",
    artifactType: "leads_export",
    direction: "download",
    executionMode: "sync",
    status: "ready",
    requestedByUserId: 10,
    scopeBranchId: 1,
    scopeTeamId: null,
    policySnapshotJson: "{}",
    workflowContextJson: "{}",
    errorCode: null,
    errorMessage: null,
    expiresAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeFileAsset(overrides?: Partial<FileAsset>): FileAsset {
  return {
    id: 7,
    storageKey: "files/leads-export-42.csv",
    originalFilename: "leads.csv",
    safeDisplayFilename: "leads.csv",
    detectedMime: "text/csv",
    extension: "csv",
    sizeBytes: 12,
    sha256Hex: "hash",
    signatureKind: "csv",
    scanStatus: "clean",
    scanEngine: null,
    scanReference: null,
    createdAt: 1,
    ...overrides,
  };
}

function createDownloadTokenDeps(input: {
  artifact: WorkflowArtifact;
  fileAsset?: FileAsset | null;
  onInsertToken?: () => void;
}): DownloadTokenDeps {
  return {
    repo: {
      findArtifactById: async (artifactId) => {
        if (artifactId !== input.artifact.id) {
          return null;
        }
        return input.artifact;
      },
      findFileAssetForArtifact: async () => input.fileAsset ?? null,
      insertDownloadToken: async () => {
        input.onInsertToken?.();
      },
      insertEvent: async () => {},
    },
  };
}

describe("requestDownloadToken", () => {
  it("rejects token issuance when artifact is not ready", async () => {
    let tokenInsertCount = 0;
    const deps = createDownloadTokenDeps({
      artifact: makeArtifact({ status: "processing" }),
      fileAsset: makeFileAsset(),
      onInsertToken: () => {
        tokenInsertCount += 1;
      },
    });

    const result = await requestDownloadToken(
      makeContext(),
      "artifact-42",
      deps,
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe(
      "artifact_not_downloadable",
    );
    expect(tokenInsertCount).toBe(0);
  });

  it("issues token for ready artifact", async () => {
    let tokenInsertCount = 0;
    const deps = createDownloadTokenDeps({
      artifact: makeArtifact({ status: "ready" }),
      fileAsset: makeFileAsset(),
      onInsertToken: () => {
        tokenInsertCount += 1;
      },
    });

    const result = await requestDownloadToken(
      makeContext(),
      "artifact-42",
      deps,
    );

    expect(isErr(result)).toBe(false);
    expect(!isErr(result) && result.value.token.length > 10).toBe(true);
    expect(tokenInsertCount).toBe(1);
  });

  it("rejects token issuance when artifact file is missing", async () => {
    const deps = createDownloadTokenDeps({
      artifact: makeArtifact({ status: "ready" }),
      fileAsset: null,
    });

    const result = await requestDownloadToken(
      makeContext(),
      "artifact-42",
      deps,
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("artifact_file_not_found");
  });

  it("rejects token issuance for null-scope artifact when actor is not owner", async () => {
    const deps = createDownloadTokenDeps({
      artifact: makeArtifact({
        status: "ready",
        scopeBranchId: null,
        requestedByUserId: 999,
      }),
      fileAsset: makeFileAsset(),
    });

    const result = await requestDownloadToken(
      makeContext(),
      "artifact-42",
      deps,
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("artifact_read_not_owner");
  });
});
