import type { EngineClient } from "~/server/integrations/engine/client";
import type { RegisterUploadInput } from "~/server/integrations/engine/ingest-contracts";

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
    listSources: () => engine.listIngestSources(),

    register: (input: RegisterUploadInput) =>
      engine.registerIngestUpload(input),

    uploadBlob: (
      uploadId: string,
      body: ReadableStream<Uint8Array> | Blob,
      contentLength: number,
    ) => engine.uploadIngestBlob(uploadId, body, contentLength),

    getJob: (jobId: string) => engine.getIngestJob(jobId),
  };
}
