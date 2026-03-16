import type {
  CandidateStrategy,
  SearchType,
} from "~/server/shared/engine/types";

export interface DirectSearchInput {
  type: SearchType;
  value: string;
  limit?: number;
}

export interface LeadCandidateRequestInput {
  userId: number;
  branchId: number;
  amount: number;
  teamId?: number;
  productId?: number;
  strategy?: CandidateStrategy;
}

export type { LeadCandidate } from "~/server/shared/engine/types";
