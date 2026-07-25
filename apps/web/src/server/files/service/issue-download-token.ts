import type { DomainError } from "~/domain/errors";
import type { FileAssetId } from "~/domain/ids";
import { Ok, type Result } from "~/shared/result";

import {
  DOWNLOAD_TOKEN_TTL_MS,
  generateDownloadToken,
  hashToken,
} from "../token";
import type { DownloadTokenDeps, FileOperationContext } from "./contracts";

export async function issueDownloadToken(
  ctx: FileOperationContext,
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
