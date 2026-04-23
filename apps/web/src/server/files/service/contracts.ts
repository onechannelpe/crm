import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { ArtifactRepo } from "../repo";
import type { FileStorage } from "../storage";
import type {
  ArtifactExecutionMode,
  ArtifactType,
  ArtifactWithAsset,
  DownloadReady,
  WorkflowArtifact,
} from "../types";

export interface SyncExecutor {
  run(
    artifactType: ArtifactType,
    context: Record<string, unknown>,
  ): Promise<{
    bytes: Uint8Array;
    filename: string;
  }>;
}

export type ArtifactEventRepo = Pick<ArtifactRepo, "insertEvent">;

export interface RequestArtifactInput {
  artifactType: ArtifactType;
  executionMode: ArtifactExecutionMode;
  workflowContext: Record<string, unknown>;
}

export type RequestArtifactRepo = Pick<
  ArtifactRepo,
  | "insertArtifact"
  | "updateArtifactStatus"
  | "findArtifactById"
  | "findFileAssetForArtifact"
  | "insertFileAsset"
  | "insertFileBinding"
  | "insertEvent"
>;

export type UploadArtifactRepo = Pick<
  ArtifactRepo,
  | "findArtifactById"
  | "updateArtifactStatus"
  | "insertFileAsset"
  | "insertFileBinding"
  | "insertEvent"
>;

export type DownloadTokenRepo = Pick<
  ArtifactRepo,
  | "findArtifactById"
  | "findFileAssetForArtifact"
  | "insertDownloadToken"
  | "insertEvent"
>;

export type ExecuteDownloadRepo = Pick<
  ArtifactRepo,
  | "findDownloadToken"
  | "findArtifactById"
  | "findFileAssetById"
  | "markDownloadTokenUsed"
  | "insertEvent"
>;

export type GetArtifactRepo = Pick<
  ArtifactRepo,
  "findArtifactById" | "findFileAssetForArtifact"
>;

export type ListArtifactsRepo = Pick<ArtifactRepo, "listArtifacts">;

export interface RequestArtifactDeps {
  repo: RequestArtifactRepo;
  storage: FileStorage;
  syncExecutor: SyncExecutor;
}

export interface UploadArtifactDeps {
  repo: UploadArtifactRepo;
  storage: FileStorage;
}

export interface UploadArtifactInput {
  name: string;
  sizeBytes?: number;
  stream: ReadableStream<Uint8Array>;
}

export interface DownloadTokenDeps {
  repo: DownloadTokenRepo;
}

export interface ExecuteDownloadDeps {
  repo: ExecuteDownloadRepo;
  storage: FileStorage;
}

export interface GetArtifactDeps {
  repo: GetArtifactRepo;
}

export interface ListArtifactsDeps {
  repo: ListArtifactsRepo;
}

export interface ArtifactServiceApi {
  requestArtifact: (
    ctx: AppContext,
    input: RequestArtifactInput,
    deps: RequestArtifactDeps,
  ) => Promise<Result<ArtifactWithAsset, DomainError>>;
  uploadArtifactFile: (
    ctx: AppContext,
    artifactId: string,
    file: UploadArtifactInput,
    deps: UploadArtifactDeps,
  ) => Promise<Result<WorkflowArtifact, DomainError>>;
  requestDownloadToken: (
    ctx: AppContext,
    artifactId: string,
    deps: DownloadTokenDeps,
  ) => Promise<Result<{ token: string }, DomainError>>;
  executeDownload: (
    tokenRaw: string,
    deps: ExecuteDownloadDeps,
    now: number,
  ) => Promise<Result<DownloadReady, DomainError>>;
  getArtifact: (
    ctx: AppContext,
    artifactId: string,
    deps: GetArtifactDeps,
  ) => Promise<Result<ArtifactWithAsset, DomainError>>;
  listArtifacts: (
    ctx: AppContext,
    filters: { artifactType?: ArtifactType; limit?: number; offset?: number },
    deps: ListArtifactsDeps,
  ) => Promise<Result<WorkflowArtifact[], DomainError>>;
}
