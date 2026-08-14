import { external } from "~/domain/errors";
import type { DomainError } from "~/domain/errors";
import type {
  EngineClient,
  RecordCandidatesRequest,
} from "~/server/integrations/engine/client";
import type { EngineClientConfig } from "~/server/integrations/engine/config";
import {
  ENGINE_ENDPOINTS,
  ingestJobPath,
  ingestUploadBlobPath,
} from "~/server/integrations/engine/endpoints";
import { signRequest } from "~/server/integrations/engine/signature";
import { Err, Ok, type Result } from "~/shared/result";

import {
  decodeRecordCandidatesResponse,
  decodeSearchResponse,
} from "./decoder";
import {
  decodeIngestJob,
  decodeRegisterUploadResponse,
  decodeUploadBlobResponse,
  type IngestJob,
  type RegisterUploadInput,
} from "./ingest-contracts";
import { mapEngineErrorResponse, mapEngineNetworkError } from "./mapper";

/**
 * Shared tail for every engine call once a `Response` exists: map a non-2xx
 * body, parse JSON, then narrow the untrusted payload. Only `decode` differs,
 * so it is the only thing callers supply.
 */
async function decodeEngineResponse<T>(
  response: Response,
  requestId: string,
  decode: (value: unknown) => T,
): Promise<Result<T, DomainError>> {
  if (!response.ok) {
    return Err(await mapEngineErrorResponse(response, requestId));
  }

  let responseJson: unknown;
  try {
    responseJson = await response.json();
  } catch {
    return Err(
      external("Failed to parse Engine response JSON", {
        code: "engine_response_parse_failed",
        details: { request_id: requestId },
      }),
    );
  }

  try {
    return Ok(decode(responseJson));
  } catch (error) {
    return Err(
      external(
        error instanceof Error ? error.message : "Invalid response shape",
        {
          code: "engine_response_invalid",
          details: { request_id: requestId },
        },
      ),
    );
  }
}

export function createEngineAdapter(config: EngineClientConfig): EngineClient {
  async function send(
    method: "GET" | "POST",
    path: string,
    body: string,
    requestId: string,
  ): Promise<Response> {
    // Sign with the outbound request time, not the originating operation time.
    const { signature, timestamp } = signRequest(
      body,
      config.hmacSecret,
      Date.now(),
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      return await fetch(`${config.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Key-Id": config.keyId,
          "X-Signature": signature,
          "X-Timestamp": timestamp,
          "X-Request-Id": requestId,
        },
        // fetch forbids a body on GET, so a GET signs the empty string. The
        // job id travels in the path and is therefore not covered by the
        // signature; that grants nothing extra, since any holder of the key
        // may read any job.
        ...(method === "GET" ? {} : { body }),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * The blob step can't sign its own body: the body is a byte stream that
   * must never be buffered whole just to compute an HMAC over it. It signs
   * `uploadId` instead, a value the engine already trusts since it generated
   * it and handed it back from the register step.
   */
  async function sendBlob(
    uploadId: string,
    body: ReadableStream<Uint8Array> | Blob,
    contentLength: number,
    requestId: string,
  ): Promise<Response> {
    const { signature, timestamp } = signRequest(
      uploadId,
      config.hmacSecret,
      Date.now(),
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      return await fetch(`${config.baseUrl}${ingestUploadBlobPath(uploadId)}`, {
        method: "PUT",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(contentLength),
          Accept: "application/json",
          "X-Key-Id": config.keyId,
          "X-Signature": signature,
          "X-Timestamp": timestamp,
          "X-Request-Id": requestId,
        },
        body,
        // Required by the fetch spec whenever body is a ReadableStream.
        duplex: "half",
      } as RequestInit);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Every JSON-bodied engine call has the same shape: sign and send, map a
   * transport failure, then hand off to `decodeEngineResponse`.
   */
  async function call<T>(
    method: "GET" | "POST",
    path: string,
    body: string,
    decode: (value: unknown) => T,
  ): Promise<Result<T, DomainError>> {
    const requestId = crypto.randomUUID();

    let response: Response;
    try {
      response = await send(method, path, body, requestId);
    } catch (error) {
      return Err(mapEngineNetworkError(error, requestId));
    }

    return decodeEngineResponse(response, requestId, decode);
  }

  return {
    search(intent, query, limit = 20) {
      return call(
        "POST",
        ENGINE_ENDPOINTS.search,
        JSON.stringify({ intent, query, limit }),
        (value) => decodeSearchResponse(value).results,
      );
    },

    requestCandidates(input: RecordCandidatesRequest) {
      return call(
        "POST",
        ENGINE_ENDPOINTS.recordCandidates,
        JSON.stringify({
          branch_id: input.branchId,
          user_id: input.userId,
          amount: input.amount,
          team_id: input.teamId,
          product_id: input.productId,
          strategy: input.strategy,
        }),
        (value) => decodeRecordCandidatesResponse(value).candidates,
      );
    },

    registerIngestUpload(input: RegisterUploadInput) {
      return call(
        "POST",
        ENGINE_ENDPOINTS.ingestUploads,
        JSON.stringify({
          source_key: input.sourceKey,
          snapshot_label: input.snapshotLabel,
          snapshot_date: input.snapshotDate,
          size_bytes: input.sizeBytes,
          sha256: input.sha256,
        }),
        decodeRegisterUploadResponse,
      );
    },

    async uploadIngestBlob(
      uploadId: string,
      body: ReadableStream<Uint8Array> | Blob,
      contentLength: number,
    ) {
      const requestId = crypto.randomUUID();

      let response: Response;
      try {
        response = await sendBlob(uploadId, body, contentLength, requestId);
      } catch (error) {
        return Err(mapEngineNetworkError(error, requestId));
      }

      return decodeEngineResponse(
        response,
        requestId,
        decodeUploadBlobResponse,
      );
    },

    // The engine signs over the request body, so a status read sends an empty
    // signed body rather than putting the id in a query string.
    getIngestJob(jobId: string): Promise<Result<IngestJob, DomainError>> {
      return call("GET", ingestJobPath(jobId), "", decodeIngestJob);
    },
  };
}
