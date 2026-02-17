import type { EngineClient } from "~/server/shared/engine/client";
import { engineClient } from "~/server/shared/engine/index";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { Err, Ok, type Result } from "~/server/shared/result";

interface SearchParams {
  type: SearchType;
  value: string;
  limit?: number;
}

export function createClientSearchService(client: EngineClient = engineClient) {
  return {
    async search(
      params: SearchParams,
    ): Promise<Result<SearchResponse, string>> {
      try {
        const response = await client.search(
          params.type,
          params.value,
          params.limit,
        );
        return Ok(response);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Client search failed";
        return Err(message);
      }
    },
  };
}
