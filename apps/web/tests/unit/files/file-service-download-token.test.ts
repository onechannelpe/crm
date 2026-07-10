import { describe, expect, it } from "vitest";

import type { InsertDownloadTokenInput } from "~/server/files/repo/types";
import { issueDownloadToken } from "~/server/files/service/issue-download-token";
import { DOWNLOAD_TOKEN_TTL_MS, hashToken } from "~/server/files/token";
import type { AppContext } from "~/server/platform/action/context";
import { asBranchId, asFileAssetId, asUserId } from "~/server/shared/ids";

const NOW_MS = 1_700_000_000_000;

function makeContext(): AppContext {
  return {
    actor: {
      id: "sess-1",
      userId: asUserId("user-10"),
      branchId: asBranchId("branch-1"),
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
    now: () => new Date(NOW_MS),
  };
}

describe("issueDownloadToken", () => {
  it("binds a short-lived token to an already authorized file asset", async () => {
    const fileAssetId = asFileAssetId("file-7");
    const inserted: InsertDownloadTokenInput[] = [];

    const result = await issueDownloadToken(makeContext(), fileAssetId, {
      repo: {
        tokens: {
          insert: async (input) => {
            inserted.push(input);
          },
          findByHash: async () => null,
          markUsed: async () => false,
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(inserted[0]).toMatchObject({
      fileAssetId,
      requestedByUserId: asUserId("user-10"),
      expiresAt: new Date(NOW_MS + DOWNLOAD_TOKEN_TTL_MS),
      now: new Date(NOW_MS),
    });
    expect(inserted[0]?.tokenHash).toBe(hashToken(result.value.token));
  });
});
