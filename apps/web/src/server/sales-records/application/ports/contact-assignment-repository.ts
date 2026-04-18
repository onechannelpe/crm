import type { AssignmentId, ContactId, UserId } from "~/server/shared/ids";

export interface ContactAssignmentRecord {
  id: AssignmentId;
  user_id: UserId;
  contact_id: ContactId;
  status: string;
  expires_at: number;
}

export interface ContactAssignmentRepository {
  findActiveByIdForUser(
    id: AssignmentId,
    userId: UserId,
  ): Promise<ContactAssignmentRecord | undefined>;
}
