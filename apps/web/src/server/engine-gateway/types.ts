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

export interface LeadCandidate {
  organizationId: number;
  organizationName: string;
  ruc: string;
  dni: string;
  name: string;
  phonePrimary: string | null;
  requiresBranchLock: boolean;
}
