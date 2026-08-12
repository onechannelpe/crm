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
  const rawToken = generateDownloadToken();
  const tokenHash = hashToken(rawToken);

  // The TTL runs from the stored creation stamp, so the two columns always
  // agree on when the window opened.
  const createdAt = ctx.operationAt;
  const expiresAt = new Date(createdAt.getTime() + DOWNLOAD_TOKEN_TTL_MS);

  await deps.repo.tokens.insert({
    fileAssetId,
    tokenHash,
    requestedByUserId: ctx.actor.userId,
    expiresAt,
    createdAt,
  });

  return Ok({ token: rawToken });
}
