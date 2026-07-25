import type { Generated } from "kysely";

import type {
  GeneratedId,
  IdColumn,
  OrganizationId,
  OrganizationOwnerAssignmentId,
  OrganizationPersonId,
  PersonId,
  UserId,
} from "~/domain/ids";

export interface PeopleTable {
  id: GeneratedId<PersonId>;
  dni: string;
  names: string;
  first_surname: string | null;
  second_surname: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationsTable {
  id: GeneratedId<OrganizationId>;
  ruc: string;
  legal_name: string | null;
  line_of_business: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date;
}

export interface OrganizationOwnerAssignmentsTable {
  id: GeneratedId<OrganizationOwnerAssignmentId>;
  organization_id: IdColumn<OrganizationId>;
  executive_id: IdColumn<UserId>;
  valid_from: Date;
  valid_until: Date | null;
  assigned_by: IdColumn<UserId>;
  reason: string | null;
  created_at: Date;
}

export interface OrganizationCurrentOwnersView {
  organization_id: IdColumn<OrganizationId>;
  executive_id: IdColumn<UserId>;
  assigned_at: Date;
}

export interface OrganizationPeopleTable {
  id: GeneratedId<OrganizationPersonId>;
  person_id: IdColumn<PersonId>;
  organization_id: IdColumn<OrganizationId>;
  phone: string | null;
  email: string | null;
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
