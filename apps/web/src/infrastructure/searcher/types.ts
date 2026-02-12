export interface SearcherLead {
  id: number;
  dni: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  org_ruc: string | null;
  org_name: string | null;
}

export interface SearcherResponse {
  leads: SearcherLead[];
  count: number;
}

export interface AssignRequest {
  lead_ids: number[];
  user_id: number;
  branch_id: number;
}

export interface AssignResponse {
  assigned: number;
}
