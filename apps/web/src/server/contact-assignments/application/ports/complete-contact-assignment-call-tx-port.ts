export interface CompleteContactAssignmentCallTxPort {
  contactAssignments: {
    findActiveByIdForUser(
      assignmentId: number,
      userId: number,
    ): Promise<{ contact_id: number } | undefined>;
    markCompleted(assignmentId: number, userId: number): Promise<unknown>;
  };
  interactionLogs: {
    create(input: {
      contact_id: number;
      user_id: number;
      outcome:
        | "no_answer"
        | "callback_scheduled"
        | "sale_made"
        | "invalid_data";
      notes: string | null;
      duration_seconds: number | null;
      created_at: number;
    }): Promise<unknown>;
  };
}
