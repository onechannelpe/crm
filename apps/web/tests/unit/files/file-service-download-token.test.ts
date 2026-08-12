import { makeAppContext, makeAuthSession } from "@tests/support/unit/factories";
import { describe, expect, it } from "vitest";

import { BranchId, FileAssetId, UserId } from "~/domain/ids";
import type { InsertDownloadTokenInput } from "~/server/files/repo/types";
import { issueDownloadToken } from "~/server/files/service/issue-download-token";
import { DOWNLOAD_TOKEN_TTL_MS, hashToken } from "~/server/files/token";
import type { AppContext } from "~/server/platform/action/context";

const NOW_MS = 1_700_000_000_000;

function makeContext(): AppContext {
  return makeAppContext({
    actor: makeAuthSession({
      id: "sess-1",
      userId: UserId.trust("user-10"),
      branchId: BranchId.trust("branch-1"),
      role: "back_office",
    }),
    requestId: "req-1",
    traceId: "trace-1",
    operationAt: new Date(NOW_MS),
  });
}

describe("issueDownloadToken", () => {
  it("binds a short-lived token to an already authorized file asset", async () => {
    const fileAssetId = FileAssetId.trust("file-7");
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
    if (!result.ok) {
      return;
    }
    expect(inserted[0]).toMatchObject({
      fileAssetId,
      requestedByUserId: UserId.trust("user-10"),
      expiresAt: new Date(NOW_MS + DOWNLOAD_TOKEN_TTL_MS),
    });
    expect(inserted[0]?.tokenHash).toBe(hashToken(result.value.token));
  });
});
