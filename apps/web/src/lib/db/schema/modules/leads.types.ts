import type { Generated } from "kysely";

export interface OrganizationPeopleTable {
  id: Generated<number>;
  person_id: number;
  organization_id: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string | null;
  email: string | null;
  last_contacted_at: number | null;
  last_contacted_by_user_id: number | null;
  cooldown_until: number | null;
  created_at: number;
  updated_at: number;
}

export interface OrganizationPersonRolesTable {
  id: Generated<number>;
  organization_person_id: number;
  role: string;
  is_primary: 0 | 1;
  effective_from: number;
  effective_to: number | null;
}

export interface LeadAssignmentsTable {
  id: Generated<number>;
  user_id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: "active" | "completed" | "expired";
}

export interface InteractionLogsTable {
  id: Generated<number>;
  contact_id: number;
  user_id: number;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: number;
}
