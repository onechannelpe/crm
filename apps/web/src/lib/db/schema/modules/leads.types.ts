import type { Generated } from "kysely";

import type {
  ContactAssignmentId,
  GeneratedId,
  IdColumn,
  InteractionLogId,
  NullableIdColumn,
  OrganizationId,
  OrganizationPersonId,
  PersonId,
  UserId,
} from "~/server/shared/ids";

export interface OrganizationPeopleTable {
  id: GeneratedId<OrganizationPersonId>;
  person_id: IdColumn<PersonId>;
  organization_id: IdColumn<OrganizationId>;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string | null;
  email: string | null;
  last_contacted_at: Date | null;
  last_contacted_by_user_id: NullableIdColumn<UserId>;
  cooldown_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationPersonRolesTable {
  id: Generated<string>;
  organization_person_id: IdColumn<OrganizationPersonId>;
  role: string;
  is_primary: boolean;
  effective_from: Date;
  effective_to: Date | null;
}

export interface LeadAssignmentsTable {
  id: GeneratedId<ContactAssignmentId>;
  user_id: IdColumn<UserId>;
  contact_id: IdColumn<OrganizationPersonId>;
  assigned_at: Date;
  expires_at: Date;
  status: "active" | "completed" | "expired";
}

export interface InteractionLogsTable {
  id: GeneratedId<InteractionLogId>;
  contact_id: IdColumn<OrganizationPersonId>;
  user_id: IdColumn<UserId>;
  outcome: string;
  notes: string | null;
  duration_seconds: number | null;
  created_at: Date;
}
