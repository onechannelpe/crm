import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { FileAssetId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

import type { createAssetsRepo } from "../repo/assets";
import type { createRateRevisionFilesRepo } from "../repo/rate-revision";
import type { createSalesRepo } from "../repo/sales";
import type { createTokensRepo } from "../repo/tokens";
import type { FileStorage } from "../storage";
import type { DownloadReady, FileAsset, FilePurpose } from "../types";

export interface FileRepos {
  assets: ReturnType<typeof createAssetsRepo>;
  tokens: ReturnType<typeof createTokensRepo>;
  sales: ReturnType<typeof createSalesRepo>;
  rateRevision: ReturnType<typeof createRateRevisionFilesRepo>;
}

export interface StoreUploadInput {
  purpose: FilePurpose;
  name: string;
  sizeBytes?: number;
  stream: ReadableStream<Uint8Array>;
}

export interface StoreGeneratedFileInput {
  purpose: FilePurpose;
  filename: string;
  bytes: Uint8Array;
}

export interface StoreFileDeps {
  repo: Pick<FileRepos, "assets">;
  storage: FileStorage;
}

export interface DownloadTokenDeps {
  repo: Pick<FileRepos, "tokens">;
}

export interface ExecuteDownloadDeps {
  repo: Pick<FileRepos, "tokens" | "assets">;
  storage: FileStorage;
}

export interface FileServiceApi {
  storeUploadedFile: (
    ctx: AppContext,
    input: StoreUploadInput,
    deps: StoreFileDeps,
  ) => Promise<Result<FileAsset, DomainError>>;
  storeGeneratedFile: (
    ctx: AppContext,
    input: StoreGeneratedFileInput,
    deps: StoreFileDeps,
  ) => Promise<Result<FileAsset, DomainError>>;
  issueDownloadToken: (
    ctx: AppContext,
    fileAssetId: FileAssetId,
    deps: DownloadTokenDeps,
  ) => Promise<Result<{ token: string }, DomainError>>;
  executeDownload: (
    tokenRaw: string,
    deps: ExecuteDownloadDeps,
    now: Date,
  ) => Promise<Result<DownloadReady, DomainError>>;
}
