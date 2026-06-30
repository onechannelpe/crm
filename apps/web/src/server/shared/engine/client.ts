import type { SearchIntent } from "~/contracts/search/vocabulary";
import type { EngineConfig } from "~/lib/env";
import { createEngineAdapter } from "~/server/adapters/engine/client";
import type { DomainError } from "~/server/shared/domain-error";
import { buildEngineClientConfig } from "~/server/shared/engine/config";
import type {
  RecordCandidate,
  SearchResult,
} from "~/server/shared/engine/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export interface RecordCandidatesRequest {
  branchId: BranchId;
  userId: UserId;
  amount: number;
  teamId?: TeamId;
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

export function createDefaultEngineClient(config: EngineConfig): EngineClient {
  const engineConfig = buildEngineClientConfig(config);
  return createEngineAdapter(engineConfig);
}
