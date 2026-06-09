import { external } from "~/server/shared/domain-error";
import type {
  EngineClient,
  RecordCandidatesRequest,
} from "~/server/shared/engine/client";
import type { EngineClientConfig } from "~/server/shared/engine/config";
import { ENGINE_ENDPOINTS } from "~/server/shared/engine/endpoints";
import { signRequest } from "~/server/shared/engine/signature";
import { Err, Ok } from "~/server/shared/result";

import {
  decodeSearchResponse,
  decodeRecordCandidatesResponse,
} from "./decoder";
import { mapEngineErrorResponse, mapEngineNetworkError } from "./mapper";

export function createEngineAdapter(config: EngineClientConfig): EngineClient {
  async function post(
    path: string,
    body: string,
    requestId: string,
  ): Promise<Response> {
    const { signature, timestamp } = signRequest(body, config.hmacSecret);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      return await fetch(`${config.baseUrl}${path}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Key-Id": config.keyId,
          "X-Signature": signature,
          "X-Timestamp": timestamp,
          "X-Request-Id": requestId,
        },
        body,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async search(intent, query, limit = 20) {
      const requestId = crypto.randomUUID();
      const body = JSON.stringify({ intent, query, limit });

      let response: Response;
      try {
        response = await post(ENGINE_ENDPOINTS.search, body, requestId);
      } catch (error) {
        return Err(mapEngineNetworkError(error, requestId));
      }

      if (!response.ok) {
        const domainErr = await mapEngineErrorResponse(response, requestId);
        return Err(domainErr);
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
        const decoded = decodeSearchResponse(responseJson);
        return Ok(decoded.results);
      } catch (err) {
        return Err(
          external(err instanceof Error ? err.message : "Invalid response shape", {
            code: "engine_response_invalid",
            details: { request_id: requestId },
          }),
        );
      }
    },

    async requestCandidates(input: RecordCandidatesRequest) {
      const requestId = crypto.randomUUID();
      const body = JSON.stringify({
        branch_id: input.branchId,
        user_id: input.userId,
        amount: input.amount,
        team_id: input.teamId,
        product_id: input.productId,
        strategy: input.strategy,
      });

      let response: Response;
      try {
        response = await post(
          ENGINE_ENDPOINTS.recordCandidates,
          body,
          requestId,
        );
      } catch (error) {
        return Err(mapEngineNetworkError(error, requestId));
      }

      if (!response.ok) {
        const domainErr = await mapEngineErrorResponse(response, requestId);
        return Err(domainErr);
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
        const decoded = decodeRecordCandidatesResponse(responseJson);
        return Ok(decoded.candidates);
      } catch (err) {
        return Err(
          external(err instanceof Error ? err.message : "Invalid response shape", {
            code: "engine_response_invalid",
            details: { request_id: requestId },
          }),
        );
      }
    },
  };
}
