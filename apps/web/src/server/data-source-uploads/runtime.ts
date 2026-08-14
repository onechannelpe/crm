import type { DomainError } from "~/domain/errors";
import type { EngineClient } from "~/server/integrations/engine/client";
import type {
  IngestJob,
  IngestSource,
  RegisterUploadInput,
} from "~/server/integrations/engine/ingest-contracts";
import type { Result } from "~/shared/result";

export function createDataSourceUploadsRuntime(
  engine: Pick<
    EngineClient,
    | "registerIngestUpload"
    | "uploadIngestBlob"
    | "getIngestJob"
    | "listIngestSources"
  >,
) {
  return {
    listSources: (): Promise<Result<IngestSource[], DomainError>> =>
      engine.listIngestSources(),
    register: (
      input: RegisterUploadInput,
    ): Promise<Result<{ uploadId: string }, DomainError>> =>
      engine.registerIngestUpload(input),
    uploadBlob: (
      uploadId: string,
      body: ReadableStream<Uint8Array> | Blob,
      contentLength: number,
    ): Promise<Result<{ jobId: string }, DomainError>> =>
      engine.uploadIngestBlob(uploadId, body, contentLength),
    getJob: (jobId: string): Promise<Result<IngestJob, DomainError>> =>
      engine.getIngestJob(jobId),
  };
}
