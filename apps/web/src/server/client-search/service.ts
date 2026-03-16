import type { EngineClient } from "~/server/shared/engine/client";
import { engineClient } from "~/server/shared/engine/index";
import type { SearchResponse } from "~/server/shared/engine/types";
import type { SearchType } from "~/server/shared/pipeline-types";
import { Err, Ok, type Result } from "~/server/shared/result";

interface SearchParams {
  type: SearchType;
  value: string;
  limit?: number;
}

export type ClientSearchError =
  | { reason: "engine_request_failed"; message: string }
  | { reason: "unexpected"; message: string };

export function createClientSearchService(client: EngineClient = engineClient) {
  return {
    async search(
      params: SearchParams,
    ): Promise<Result<SearchResponse, ClientSearchError>> {
      try {
        const response = await client.search(
          params.type,
          params.value,
          params.limit,
        );
        return Ok(response);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return Err({
            reason: "engine_request_failed",
            message: error.message || "Client search failed",
          });
        }
        return Err({
          reason: "unexpected",
          message: "Client search failed unexpectedly",
        });
      }
    },
  };
}
