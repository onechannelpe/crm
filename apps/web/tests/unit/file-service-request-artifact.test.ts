import { describe, expect, it } from "vitest";

import { requestArtifact } from "../../src/server/files/service/request-artifact";
import type { RequestArtifactDeps } from "../../src/server/files/service/contracts";
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

const XLSX_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);

describe("requestArtifact sync export metadata", () => {
  it("uses file metadata derived from executor output", async () => {
    const insertedAssets: Array<{
      extension: string;
      detectedMime: string;
      signatureKind: string | null;
      safeDisplayFilename: string;
      storageKey: string;
    }> = [];

    const deps: RequestArtifactDeps = {
      repo: {
        insertArtifact: async () => 42,
        updateArtifactStatus: async () => {},
        findArtifactById: async (id) => ({
          id,
          artifactType: "sales_export",
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
        findFileAssetForArtifact: async () => ({
          id: 9,
          storageKey: "sales_export-42-1700000000000.xlsx",
          originalFilename: "sales-export.xlsx",
          safeDisplayFilename: "sales-export.xlsx",
          detectedMime:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          extension: "xlsx",
          sizeBytes: XLSX_BYTES.length,
          sha256Hex: "hash",
          signatureKind: "xlsx",
          scanStatus: "clean",
          scanEngine: null,
          scanReference: null,
          createdAt: 1,
        }),
        insertFileAsset: async (input) => {
          insertedAssets.push({
            extension: input.extension,
            detectedMime: input.detectedMime,
            signatureKind: input.signatureKind,
            safeDisplayFilename: input.safeDisplayFilename,
            storageKey: input.storageKey,
          });
          return 9;
        },
        insertFileBinding: async () => {},
        insertEvent: async () => {},
      },
      storage: {
        put: async () => ({ sha256: "hash" }),
        get: async () => XLSX_BYTES,
        delete: async () => {},
      },
      syncExecutor: {
        run: async () => ({
          bytes: XLSX_BYTES,
          filename: "sales-export.xlsx",
        }),
      },
    };

    const result = await requestArtifact(
      makeContext(),
      {
        artifactType: "sales_export",
        executionMode: "sync",
        workflowContext: {},
      },
      deps,
    );

    expect(isErr(result)).toBe(false);
    expect(insertedAssets[0]?.extension).toBe("xlsx");
    expect(insertedAssets[0]?.signatureKind).toBe("xlsx");
    expect(insertedAssets[0]?.detectedMime).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(insertedAssets[0]?.storageKey.endsWith(".xlsx")).toBe(true);
  });
});
