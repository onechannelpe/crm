import { domainError, type DomainError } from "~/server/shared/domain-error";
import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { SearchResponse } from "~/server/shared/engine/types";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { DirectSearchInput } from "./types";

export function createEngineSearchService(engine: EngineClient = engineClient) {
  return {
    async searchDirect(
      input: DirectSearchInput,
    ): Promise<Result<SearchResponse, DomainError>> {
      try {
        const response = await engine.search(
          input.type,
          input.value,
          input.limit,
        );
        return Ok(response);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return Err(
            domainError(
              "external",
              "engine_request_failed",
              error.message || "Direct search failed",
            ),
          );
        }
        return Err(
          domainError(
            "unexpected",
            "unexpected",
            "Direct search failed unexpectedly",
          ),
        );
      }
    },
  };
}
