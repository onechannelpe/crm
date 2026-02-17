"use server";

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
    throw new Error(result.error);
  }

  return result.value;
}
