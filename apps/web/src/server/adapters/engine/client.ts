import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import {
  ENGINE_ENDPOINTS,
  engineApiPath,
} from "~/server/shared/engine/contract";
import { signRequest } from "~/server/shared/engine/signature";
import type { LeadCandidate, SearchResult } from "~/server/shared/engine/types";
import type { SearchType } from "~/server/shared/pipeline-types";
import type { Result } from "~/server/shared/result";
import { Err, Ok } from "~/server/shared/result";

import { decodeSearchResponse, decodeLeadCandidatesResponse } from "./decoder";
import { mapEngineErrorResponse, mapEngineNetworkError } from "./mapper";

interface EngineClientConfig {
  baseUrl: string;
  keyId: string;
  hmacSecret: string;
  timeoutMs: number;
}

export interface EngineClient {
  search(
    type: SearchType,
    value: string,
    limit?: number,
  ): Promise<Result<SearchResult[], DomainError>>;

  requestCandidates(input: {
    branchId: number;
    userId: number;
    amount: number;
    teamId?: number;
    productId?: number;
    strategy?: string;
  }): Promise<Result<LeadCandidate[], DomainError>>;
}

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
    async search(type, value, limit = 20) {
      const requestId = crypto.randomUUID();
      const body = JSON.stringify({ type, value, limit });

      let response: Response;
      try {
        response = await post(
          engineApiPath(ENGINE_ENDPOINTS.search),
          body,
          requestId,
        );
      } catch (error) {
        return Err(mapEngineNetworkError(error, requestId));
      }

      // Handle non-OK response
      if (!response.ok) {
        const domainErr = await mapEngineErrorResponse(response, requestId);
        return Err(domainErr);
      }

      // Decode response
      let responseJson: unknown;
      try {
        responseJson = await response.json();
      } catch {
        return Err(
          domainError(
            "unexpected",
            "engine_response_parse_failed",
            "Failed to parse Engine response JSON",
            { request_id: requestId },
          ),
        );
      }

      // Validate response shape
      try {
        const decoded = decodeSearchResponse(responseJson);
        return Ok(decoded.results);
      } catch (err) {
        return Err(
          domainError(
            "unexpected",
            "engine_response_invalid",
            err instanceof Error ? err.message : "Invalid response shape",
            { request_id: requestId },
          ),
        );
      }
    },

    async requestCandidates(input) {
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
          engineApiPath(ENGINE_ENDPOINTS.leadCandidates),
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
          domainError(
            "unexpected",
            "engine_response_parse_failed",
            "Failed to parse Engine response JSON",
            { request_id: requestId },
          ),
        );
      }

      try {
        const decoded = decodeLeadCandidatesResponse(responseJson);
        return Ok(decoded.candidates);
      } catch (err) {
        return Err(
          domainError(
            "unexpected",
            "engine_response_invalid",
            err instanceof Error ? err.message : "Invalid response shape",
            { request_id: requestId },
          ),
        );
      }
    },
  };
}
