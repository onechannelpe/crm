import { describe, expect, it } from "vitest";

import type { RequestArtifactDeps } from "~/server/files/service/contracts";
import { requestArtifact } from "~/server/files/service/request-artifact";
import type { AppContext } from "~/server/shared/action-runtime/context";
import { isErr } from "~/server/shared/result";

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

describe("requestArtifact", () => {
  it("rejects download artifact creation from generic path", async () => {
    const deps: RequestArtifactDeps = {
      repo: {
        artifacts: {
          insert: async () => "artifact-42",
          updateStatus: async () => {},
          findById: async (id) => ({
            id,
            artifactType: "records_export",
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
          }),
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
    };

    const result = await requestArtifact(
      makeContext(),
      {
        artifactType: "records_export",
        executionMode: "sync",
        workflowContext: {},
      },
      deps,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected error result");
    }
    expect(result.error.code).toBe(
      "download_artifact_requires_generated_payload",
    );
  });
});
