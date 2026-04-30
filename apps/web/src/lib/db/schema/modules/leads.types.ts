import type { Generated } from "kysely";

export interface ContactsTable {
  id: Generated<number>;
  organization_id: number;
  dni: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  last_contacted_at: number | null;
  last_contacted_by_user_id: number | null;
  cooldown_until: number | null;
  created_at: number;
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
