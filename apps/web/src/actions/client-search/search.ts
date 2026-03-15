"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { clientSearchService } from "~/server/shared/context";
import { searchAccessService } from "~/server/shared/context";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { isErr } from "~/server/shared/result";

export async function searchClients(
  type: SearchType,
  value: string,
  limit?: number,
): Promise<SearchResponse> {
  const session = await requirePermission("client_search:read");
  const allowanceResult = await searchAccessService.consumeSearch(session.userId);
  if (isErr(allowanceResult)) {
    throw internalError(allowanceResult.error.message);
  }
  const result = await clientSearchService.search({ type, value, limit });

  if (isErr(result)) {
    await searchAccessService.refundSearch(session.userId);
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
