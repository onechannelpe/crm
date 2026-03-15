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

export type { LeadCandidate } from "~/server/shared/engine/types";
