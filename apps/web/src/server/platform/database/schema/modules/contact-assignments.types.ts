import type {
  ContactAssignmentId,
  GeneratedId,
  IdColumn,
  InteractionLogId,
  NullableIdColumn,
  OrganizationPersonId,
  UserId,
} from "~/domain/ids";

export interface ContactAssignmentsTable {
  id: GeneratedId<ContactAssignmentId>;
  user_id: IdColumn<UserId>;
  contact_id: IdColumn<OrganizationPersonId>;
  assigned_at: Date;
  expires_at: Date;
  status: "active" | "completed" | "expired";
}

export interface ContactCadenceTable {
  organization_person_id: IdColumn<OrganizationPersonId>;
  last_contacted_at: Date | null;
  last_contacted_by_user_id: NullableIdColumn<UserId>;
  cooldown_until: Date | null;
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
