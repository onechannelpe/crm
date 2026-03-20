import type { DomainError } from "~/server/shared/domain-error";
import type { LeadCandidate, SearchResult } from "~/server/shared/engine/types";
import type { SearchType } from "~/server/shared/pipeline-types";
import type { Result } from "~/server/shared/result";

export interface LeadCandidatesRequest {
  branchId: number;
  userId: number;
  amount: number;
  teamId?: number;
  productId?: number;
  strategy?: string;
}

export interface EngineClient {
  search(
    type: SearchType,
    value: string,
    limit?: number,
  ): Promise<Result<SearchResult[], DomainError>>;
  requestCandidates(
    input: LeadCandidatesRequest,
  ): Promise<Result<LeadCandidate[], DomainError>>;
}
