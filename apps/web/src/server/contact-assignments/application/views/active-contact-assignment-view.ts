export type ActiveContactAssignmentView = {
  assignmentId: number;
  assigned_at: number;
  expires_at: number;
  status: "active" | "completed" | "expired";
  contactId: number;
  name: string;
  dni: string;
  phone_primary: string | null;
  organization_id: number;
};
