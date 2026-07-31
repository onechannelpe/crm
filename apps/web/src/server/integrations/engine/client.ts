import type { RecordCandidate } from "~/contracts/engine/record-api.generated";
import type { SearchResult } from "~/contracts/search/engine-results.generated";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import type { DomainError } from "~/domain/errors";
import type { BranchId, TeamId, UserId } from "~/domain/ids";
import { buildEngineClientConfig } from "~/server/integrations/engine/config";
import { createEngineAdapter } from "~/server/integrations/engine/http-client";
import type { EngineConfig } from "~/server/platform/config/env";
import type { Result } from "~/shared/result";

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
