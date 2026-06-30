import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { WorkflowArtifactId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

import type { createArtifactsRepo } from "../repo/artifacts";
import type { createAssetsRepo } from "../repo/assets";
import type { createEventsRepo } from "../repo/events";
import type { createRateRevisionFilesRepo } from "../repo/rate-revision";
import type { createSalesRepo } from "../repo/sales";
import type { createTokensRepo } from "../repo/tokens";
import type { FileStorage } from "../storage";
import type {
  ArtifactExecutionMode,
  ArtifactType,
  ArtifactWithAsset,
  DownloadReady,
  WorkflowArtifact,
} from "../types";

export interface ArtifactRepos {
  artifacts: ReturnType<typeof createArtifactsRepo>;
  assets: ReturnType<typeof createAssetsRepo>;
  events: ReturnType<typeof createEventsRepo>;
  tokens: ReturnType<typeof createTokensRepo>;
  sales: ReturnType<typeof createSalesRepo>;
  rateRevision: ReturnType<typeof createRateRevisionFilesRepo>;
}

export type ArtifactEventRepo = Pick<ArtifactRepos, "events">;

export interface RequestArtifactInput {
  artifactType: ArtifactType;
  executionMode: ArtifactExecutionMode;
  workflowContext: Record<string, unknown>;
}

export type RequestArtifactRepo = Pick<
  ArtifactRepos,
  "artifacts" | "assets" | "events"
>;

export type UploadArtifactRepo = Pick<
  ArtifactRepos,
  "artifacts" | "assets" | "events"
>;

export type DownloadTokenRepo = Pick<
  ArtifactRepos,
  "artifacts" | "tokens" | "events"
>;

export type ExecuteDownloadRepo = Pick<
  ArtifactRepos,
  "tokens" | "artifacts" | "assets" | "events"
>;

export type GetArtifactRepo = Pick<ArtifactRepos, "artifacts">;

export type ListArtifactsRepo = Pick<ArtifactRepos, "artifacts">;

export interface RequestArtifactDeps {
  repo: RequestArtifactRepo;
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
  ) => Promise<Result<WorkflowArtifact, DomainError>>;
  uploadArtifactFile: (
    ctx: AppContext,
    artifactId: WorkflowArtifactId,
    file: UploadArtifactInput,
    deps: UploadArtifactDeps,
  ) => Promise<Result<WorkflowArtifact, DomainError>>;
  requestDownloadToken: (
    ctx: AppContext,
    artifactId: WorkflowArtifactId,
    deps: DownloadTokenDeps,
  ) => Promise<Result<{ token: string }, DomainError>>;
  executeDownload: (
    tokenRaw: string,
    deps: ExecuteDownloadDeps,
    now: Date,
  ) => Promise<Result<DownloadReady, DomainError>>;
  getArtifact: (
    ctx: AppContext,
    artifactId: WorkflowArtifactId,
    deps: GetArtifactDeps,
  ) => Promise<Result<ArtifactWithAsset, DomainError>>;
  listArtifacts: (
    ctx: AppContext,
    filters: { artifactType?: ArtifactType; limit?: number; offset?: number },
    deps: ListArtifactsDeps,
  ) => Promise<Result<WorkflowArtifact[], DomainError>>;
}
