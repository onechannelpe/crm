import { describe, expect, it } from "vitest";

import type { UploadArtifactDeps } from "../../src/server/files/service/contracts";
import { uploadArtifactFile } from "../../src/server/files/service/upload-artifact";
import type { WorkflowArtifact } from "../../src/server/files/types";
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
    artifactType: "integration_import",
    direction: "upload",
    executionMode: "async",
    status: "requested",
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

const CSV_BYTES = new TextEncoder().encode("id,name\n1,test\n");

function streamFromBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("uploadArtifactFile", () => {
  it("marks artifact as failed on unexpected storage error", async () => {
    const updates: Array<{
      status: string;
      now: number;
      error?: { code: string; message: string };
    }> = [];

    const deps: UploadArtifactDeps = {
      repo: {
        artifacts: {
          findById: async () => makeArtifact(),
          updateStatus: async (_id, status, now, error) => {
            updates.push({ status, now, error });
          },
          insert: async () => "unused",
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          insert: async () => 1,
          findById: async () => null,
        },
        events: {
          insert: async () => {},
          list: async () => [],
        },
      },
      storage: {
        putFromWebStream: async () => {
          throw new Error("storage unavailable");
        },
        putBytes: async () => ({ sha256: "unused", sizeBytes: 0 }),
        getBytes: async () => new Uint8Array(),
        delete: async () => {},
      },
    };

    await expect(
      uploadArtifactFile(
        makeContext(),
        "artifact-42",
        {
          name: "import.csv",
          sizeBytes: CSV_BYTES.length,
          stream: streamFromBytes(CSV_BYTES),
        },
        deps,
      ),
    ).rejects.toThrow("storage unavailable");
    expect(updates.map((u) => u.status)).toEqual([
      "receiving",
      "validating",
      "scanning",
      "failed",
    ]);
    expect(updates[3]?.error?.code).toBe("artifact_upload_unexpected_error");
  });

  it("uses one operation timestamp for state updates", async () => {
    const operationNow = 1_700_000_123_456;
    const updateTimes: number[] = [];

    const deps: UploadArtifactDeps = {
      repo: {
        artifacts: {
          findById: async () => makeArtifact({ status: "requested" }),
          updateStatus: async (_id, _status, now) => {
            updateTimes.push(now);
          },
          insert: async () => "unused",
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          insert: async () => 9,
          findById: async () => null,
        },
        events: {
          insert: async () => {},
          list: async () => [],
        },
      },
      storage: {
        putFromWebStream: async () => ({
          sha256: "abc123",
          sizeBytes: CSV_BYTES.length,
        }),
        putBytes: async () => ({ sha256: "unused", sizeBytes: 0 }),
        getBytes: async () => new Uint8Array(),
        delete: async () => {},
      },
    };

    const result = await uploadArtifactFile(
      makeContext({ now: () => operationNow }),
      "artifact-42",
      {
        name: "import.csv",
        sizeBytes: CSV_BYTES.length,
        stream: streamFromBytes(CSV_BYTES),
      },
      deps,
    );

    expect(isErr(result)).toBe(false);
    expect(updateTimes).toEqual([
      operationNow,
      operationNow,
      operationNow,
      operationNow,
    ]);
  });
});
