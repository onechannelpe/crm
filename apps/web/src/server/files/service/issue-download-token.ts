import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { FileAssetId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import {
  DOWNLOAD_TOKEN_TTL_MS,
  generateDownloadToken,
  hashToken,
} from "../token";
import type { DownloadTokenDeps } from "./contracts";

export async function issueDownloadToken(
  ctx: AppContext,
  fileAssetId: FileAssetId,
  deps: DownloadTokenDeps,
): Promise<Result<{ token: string }, DomainError>> {
  const now = ctx.now();
  const rawToken = generateDownloadToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + DOWNLOAD_TOKEN_TTL_MS);

  await deps.repo.tokens.insert({
    fileAssetId,
    tokenHash,
    requestedByUserId: ctx.actor.userId,
    expiresAt,
    now,
  });

  return Ok({ token: rawToken });
}
