export interface ContactAssignmentRecord {
  id: number;
  user_id: number;
  contact_id: number;
  status: string;
  expires_at: number;
}

export interface ContactAssignmentRepository {
  findActiveByIdForUser(
    id: number,
    userId: number,
  ): Promise<ContactAssignmentRecord | undefined>;
}
