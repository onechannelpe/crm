import { getEnvFor } from "~/lib/env";
import { createEngineAdapter } from "~/server/adapters/engine/client";
import type { DomainError } from "~/server/shared/domain-error";
import { buildEngineClientConfig } from "~/server/shared/engine/config";
import type {
  RecordCandidate,
  SearchResult,
} from "~/server/shared/engine/types";
import type { Result } from "~/server/shared/result";
import type { SearchIntent } from "~/server/shared/workflow-types";

export interface RecordCandidatesRequest {
  branchId: number;
  userId: number;
  amount: number;
  teamId?: number;
  productId?: number;
  strategy?: string;
}

export interface EngineClient {
  search(
    intent: SearchIntent,
    query: string,
    limit?: number,
  ): Promise<Result<SearchResult[], DomainError>>;
  requestCandidates(
    input: RecordCandidatesRequest,
  ): Promise<Result<RecordCandidate[], DomainError>>;
}

export function createDefaultEngineClient(): EngineClient {
  const engineConfig = buildEngineClientConfig(getEnvFor("engine"));
  return createEngineAdapter(engineConfig);
}
