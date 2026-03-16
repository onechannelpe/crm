export interface DirectSearchInput {
  type:
    | "dni"
    | "ruc"
    | "phone"
    | "person_name"
    | "company_name"
    | "phone_enriched";
  value: string;
  limit?: number;
}

export interface LeadCandidateRequestInput {
  userId: number;
  branchId: number;
  amount: number;
  teamId?: number;
  productId?: number;
  strategy?: "balanced" | "freshness" | "conversion";
}

export type { LeadCandidate } from "~/server/shared/engine/types";
