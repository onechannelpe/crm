import type { RecordCandidate } from "~/contracts/engine/record-api.generated";
import type { SearchResult } from "~/contracts/search/engine-results.generated";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import type { DomainError } from "~/domain/errors";
import type { BranchId, TeamId, UserId } from "~/domain/ids";
import { buildEngineClientConfig } from "~/server/integrations/engine/config";
import { createEngineAdapter } from "~/server/integrations/engine/http-client";
import type {
  IngestJob,
  RegisterUploadInput,
} from "~/server/integrations/engine/ingest-contracts";
import type { EngineConfig } from "~/server/platform/config/env";
import type { Result } from "~/shared/result";

export interface RecordCandidatesRequest {
  branchId: BranchId;
  userId: UserId;
  amount: number;
  teamId?: TeamId;
  productId?: number;
  strategy?: string;
}

export interface EngineClient {
  search(
    intent: SearchIntent,
    query: string,
    limit?: number,
  ): Promise<Result<SearchResult[], DomainError>>;
  requestCandidates(
    input: RecordCandidatesRequest,
  ): Promise<Result<RecordCandidate[], DomainError>>;
  /**
   * Reserves a queue slot for a file the caller is about to stream in via
   * `uploadIngestBlob`. Fails fast on an unknown source_key, a bad
   * snapshot_date, or a declared size over the engine's configured limit,
   * before any bytes move.
   */
  registerIngestUpload(
    input: RegisterUploadInput,
  ): Promise<Result<{ uploadId: string }, DomainError>>;
  /**
   * Streams the file's bytes to the engine, which hashes them incrementally
   * and verifies the result against the sha256 declared at registration. On
   * success this is what actually creates and enqueues the ingest job; the
   * work runs for minutes afterwards and is followed with `getIngestJob`.
   */
  uploadIngestBlob(
    uploadId: string,
    body: ReadableStream<Uint8Array> | Blob,
    contentLength: number,
  ): Promise<Result<{ jobId: string }, DomainError>>;
  getIngestJob(jobId: string): Promise<Result<IngestJob, DomainError>>;
}

export function createDefaultEngineClient(config: EngineConfig): EngineClient {
  const engineConfig = buildEngineClientConfig(config);
  return createEngineAdapter(engineConfig);
}
