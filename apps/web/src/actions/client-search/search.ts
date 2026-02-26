"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { clientSearchService } from "~/server/shared/context";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { isErr } from "~/server/shared/result";

export async function searchClients(
  type: SearchType,
  value: string,
  limit?: number,
): Promise<SearchResponse> {
  await requirePermission("client_search:read");
  const result = await clientSearchService.search({ type, value, limit });

  if (isErr(result)) {
    switch (result.error.reason) {
      case "engine_request_failed":
        throw internalError(result.error.message);
      case "unexpected":
        throw internalError(result.error.message);
      default: {
        const exhausted: never = result.error;
        throw internalError(
          `Unhandled client search error: ${String(exhausted)}`,
        );
      }
    }
  }

  return result.value;
}
