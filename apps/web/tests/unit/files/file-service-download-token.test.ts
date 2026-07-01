import { describe, expect, it } from "vitest";

import type { DownloadTokenDeps } from "~/server/files/service/contracts";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import type { FileAsset, WorkflowArtifact } from "~/server/files/types";
import type { AppContext } from "~/server/platform/action/context";
import {
  asBranchId,
  asFileAssetId,
  asUserId,
  asWorkflowArtifactId,
} from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

const NOW = new Date(1_700_000_000_000);

function makeContext(overrides?: Partial<AppContext>): AppContext {
  return {
    actor: {
      id: "sess-1",
      userId: asUserId("10"),
      branchId: asBranchId("1"),
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
    now: () => NOW,
    ...overrides,
  };
}

function makeArtifact(overrides?: Partial<WorkflowArtifact>): WorkflowArtifact {
  return {
    id: asWorkflowArtifactId("artifact-42"),
    artifactType: "records_export",
    direction: "download",
    executionMode: "sync",
    status: "ready",
    requestedByUserId: asUserId("10"),
    scopeBranchId: asBranchId("1"),
    scopeTeamId: null,
    policySnapshotJson: "{}",
    workflowContextJson: "{}",
    errorCode: null,
    errorMessage: null,
    expiresAt: null,
    createdAt: new Date(1),
    updatedAt: new Date(1),
    ...overrides,
  };
}

function makeFileAsset(overrides?: Partial<FileAsset>): FileAsset {
  return {
    id: asFileAssetId("7"),
    storageKey: "files/records-export-42.csv",
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
    createdAt: new Date(1),
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
      artifacts: {
        findById: async (artifactId) => {
          if (artifactId !== input.artifact.id) {
            return null;
          }
          return input.artifact;
        },
        findFileAssetForArtifact: async () => input.fileAsset ?? null,
        insert: async () => asWorkflowArtifactId("unused"),
        updateStatus: async () => {},
        insertFileBinding: async () => {},
        list: async () => [],
      },
      tokens: {
        insert: async () => {
          input.onInsertToken?.();
        },
        findByHash: async () => null,
        markUsed: async () => false,
      },
      events: {
        insert: async () => {},
        list: async () => [],
      },
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
      asWorkflowArtifactId("artifact-42"),
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
      asWorkflowArtifactId("artifact-42"),
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
      asWorkflowArtifactId("artifact-42"),
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
        requestedByUserId: asUserId("999"),
      }),
      fileAsset: makeFileAsset(),
    });

    const result = await requestDownloadToken(
      makeContext(),
      asWorkflowArtifactId("artifact-42"),
      deps,
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("artifact_read_not_owner");
  });
});
