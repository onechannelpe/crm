import type { DomainError } from "~/server/shared/domain-error";
import type {
  RecordCandidate,
  SearchResult,
} from "~/server/shared/engine/types";
import type { Result } from "~/server/shared/result";
import type { SearchType } from "~/server/shared/workflow-types";

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
    type: SearchType,
    value: string,
    limit?: number,
  ): Promise<Result<SearchResult[], DomainError>>;
  requestCandidates(
    input: RecordCandidatesRequest,
  ): Promise<Result<RecordCandidate[], DomainError>>;
}
