import { describe, expect, it } from "vitest";

import type { UploadArtifactDeps } from "~/server/files/service/contracts";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import type { WorkflowArtifact } from "~/server/files/types";
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
    artifactType: "integration_import",
    direction: "upload",
    executionMode: "async",
    status: "requested",
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
      now: Date;
      error?: { code: string; message: string };
    }> = [];

    const deps: UploadArtifactDeps = {
      repo: {
        artifacts: {
          findById: async () => makeArtifact(),
          updateStatus: async (_id, status, now, error) => {
            updates.push({ status, now, error });
          },
          insert: async () => asWorkflowArtifactId("unused"),
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          insert: async () => asFileAssetId("1"),
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
        asWorkflowArtifactId("artifact-42"),
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
    const operationNow = new Date(1_700_000_123_456);
    const updateTimes: Date[] = [];

    const deps: UploadArtifactDeps = {
      repo: {
        artifacts: {
          findById: async () => makeArtifact({ status: "requested" }),
          updateStatus: async (_id, _status, now) => {
            updateTimes.push(now);
          },
          insert: async () => asWorkflowArtifactId("unused"),
          findFileAssetForArtifact: async () => null,
          insertFileBinding: async () => {},
          list: async () => [],
        },
        assets: {
          insert: async () => asFileAssetId("9"),
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
      asWorkflowArtifactId("artifact-42"),
      {
        name: "import.csv",
        sizeBytes: CSV_BYTES.length,
        stream: streamFromBytes(CSV_BYTES),
      },
      deps,
    );

    expect(isErr(result)).toBe(false);
    expect(updateTimes.map((t) => t.getTime())).toEqual([
      operationNow.getTime(),
      operationNow.getTime(),
      operationNow.getTime(),
      operationNow.getTime(),
    ]);
  });
});
