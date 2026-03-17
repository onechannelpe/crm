import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { SearchResult } from "~/server/shared/engine/result-contract";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { SearchType } from "~/server/shared/pipeline-types";

export interface SearchGatewayRequest {
  type: SearchType;
  value: string;
  limit: number;
}

export interface SearchGatewayResponse {
  results: SearchResult[];
  count: number;
}

export async function search(
  request: SearchGatewayRequest,
  engine: EngineClient = engineClient,
): Promise<Result<SearchGatewayResponse, DomainError>> {
  try {
    const response = await engine.search(request.type, request.value, request.limit);
    return Ok(response);
  } catch (error) {
    return Err(
      domainError(
        "external",
        "engine_request_failed",
        error instanceof Error ? error.message : "Search request failed",
      ),
    );
  }
}
