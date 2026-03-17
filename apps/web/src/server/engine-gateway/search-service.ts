import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { SearchResponse } from "~/server/shared/engine/types";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { DirectSearchError } from "./errors";
import type { DirectSearchInput } from "./types";

export function createEngineSearchService(engine: EngineClient = engineClient) {
  return {
    async searchDirect(
      input: DirectSearchInput,
    ): Promise<Result<SearchResponse, DirectSearchError>> {
      try {
        const response = await engine.search(
          input.type,
          input.value,
          input.limit,
        );
        return Ok(response);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return Err({
            reason: "engine_request_failed",
            message: error.message || "Direct search failed",
          });
        }
        return Err({
          reason: "unexpected",
          message: "Direct search failed unexpectedly",
        });
      }
    },
  };
}
