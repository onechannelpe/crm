import { describe, expect, it } from "vitest";

import type { InsertFileAssetInput } from "~/server/files/repo/types";
import { storeUploadedFile } from "~/server/files/service/store-uploaded-file";
import type { FileAsset } from "~/server/files/types";
import type { AppContext } from "~/server/platform/action/context";
import { BranchId, FileAssetId, UserId } from "~/server/shared/ids";

const NOW = new Date(1_700_000_123_456);
const CSV_BYTES = new TextEncoder().encode("id,name\n1,test\n");

function makeContext(): AppContext {
  return {
    actor: {
      id: "sess-1",
      userId: UserId.trust("user-10"),
      branchId: BranchId.trust("branch-1"),
      role: "back_office",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
      impersonatorUserId: null,
    },
    requestId: "req-1",
    traceId: "trace-1",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    publicOrigin: "http://localhost:3000",
    now: () => NOW,
  };
}

function stream(bytes = CSV_BYTES): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("storeUploadedFile", () => {
  it("stores validated bytes and persists infrastructure metadata", async () => {
    const id = FileAssetId.trust("file-1");
    const inserted: InsertFileAssetInput[] = [];
    let storedKey = "";
    const asset: FileAsset = {
      id,
      storageKey: "integration_import/2023/11/file.csv",
      purpose: "integration_import",
      originalFilename: "import.csv",
      safeDisplayFilename: "import.csv",
      detectedMime: "text/csv; charset=utf-8",
      extension: "csv",
      sizeBytes: CSV_BYTES.length,
      sha256Hex: "abc123",
      signatureKind: "csv",
      scanStatus: "clean",
      scanEngine: null,
      scanReference: null,
      createdByUserId: UserId.trust("user-10"),
      createdAt: NOW,
    };

    const result = await storeUploadedFile(
      makeContext(),
      { purpose: "integration_import", name: "import.csv", stream: stream() },
      {
        repo: {
          assets: {
            insert: async (input) => {
              inserted.push(input);
              return id;
            },
            findById: async () => asset,
          },
        },
        storage: {
          putFromWebStream: async ({ key, stream: body, onChunk }) => {
            storedKey = key;
            const reader = body.getReader();
            for (;;) {
              const chunk = await reader.read();
              if (chunk.done) break;
              await onChunk?.(chunk.value);
            }
            return { sha256: "abc123", sizeBytes: CSV_BYTES.length };
          },
          putBytes: async () => ({ sha256: "unused", sizeBytes: 0 }),
          getBytes: async () => new Uint8Array(),
          delete: async () => {},
        },
      },
    );

    expect(result).toEqual({ ok: true, value: asset });
    expect(storedKey).toMatch(/^integration_import\/.+\.csv$/);
    expect(inserted[0]).toMatchObject({
      purpose: "integration_import",
      originalFilename: "import.csv",
      sizeBytes: CSV_BYTES.length,
      createdByUserId: UserId.trust("user-10"),
      now: NOW,
    });
  });

  it("does not translate an infrastructure outage into a domain result", async () => {
    await expect(
      storeUploadedFile(
        makeContext(),
        { purpose: "integration_import", name: "import.csv", stream: stream() },
        {
          repo: {
            assets: {
              insert: async () => FileAssetId.trust("unused"),
              findById: async () => null,
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
        },
      ),
    ).rejects.toThrow("storage unavailable");
  });
});
