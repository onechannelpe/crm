import { engineClient } from "~/server/shared/composition-root";
import type { DomainError } from "~/server/shared/domain-error";
import type { SearchResult } from "~/server/shared/engine/types";
import type { SearchType } from "~/server/shared/pipeline-types";
import type { Result } from "~/server/shared/result";

export interface SearchGatewayRequest {
  type: SearchType;
  value: string;
  limit: number;
}

export type SearchGatewayResponse = SearchResult;

export async function search(
  request: SearchGatewayRequest,
  engine: { search: typeof engineClient.search } = engineClient,
): Promise<Result<SearchGatewayResponse[], DomainError>> {
  return engine.search(request.type, request.value, request.limit);
}
