import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type {
  CandidateStrategy,
  SearchType,
} from "~/server/shared/pipeline-types";

export interface DirectSearchInput {
  type: SearchType;
  value: string;
  limit?: number;
}

export interface LeadCandidateRequestInput {
  userId: UserId;
  branchId: BranchId;
  amount: number;
  teamId?: TeamId;
  productId?: number;
  strategy?: CandidateStrategy;
}

export type { LeadCandidate } from "~/server/shared/engine/types";
