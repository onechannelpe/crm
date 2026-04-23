import { describe, expect, it } from "vitest";

import type { RequestArtifactDeps } from "../../src/server/files/service/contracts";
import { requestArtifact } from "../../src/server/files/service/request-artifact";
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

const CSV_BYTES = new TextEncoder().encode("ruc,nombre\n201,Acme");

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
        }),
        findFileAssetForArtifact: async () => ({
          id: 9,
          storageKey: "leads_export-42-1700000000000.csv",
          originalFilename: "leads-export.csv",
          safeDisplayFilename: "leads-export.csv",
          detectedMime: "text/csv; charset=utf-8",
          extension: "csv",
          sizeBytes: CSV_BYTES.length,
          sha256Hex: "hash",
          signatureKind: "csv",
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
        putFromWebStream: async () => ({
          sha256: "unused",
          sizeBytes: CSV_BYTES.length,
        }),
        putBytes: async () => ({
          sha256: "hash",
          sizeBytes: CSV_BYTES.length,
        }),
        getBytes: async () => CSV_BYTES,
        delete: async () => {},
      },
      syncExecutor: {
        run: async () => ({
          bytes: CSV_BYTES,
          filename: "leads-export.csv",
        }),
      },
    };

    const result = await requestArtifact(
      makeContext(),
      {
        artifactType: "leads_export",
        executionMode: "sync",
        workflowContext: {},
      },
      deps,
    );

    expect(isErr(result)).toBe(false);
    expect(insertedAssets[0]?.extension).toBe("csv");
    expect(insertedAssets[0]?.signatureKind).toBe("csv");
    expect(insertedAssets[0]?.detectedMime).toBe("text/csv; charset=utf-8");
    expect(insertedAssets[0]?.storageKey.endsWith(".csv")).toBe(true);
  });
});
