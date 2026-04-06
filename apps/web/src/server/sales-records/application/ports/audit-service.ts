export interface SalesRecordAuditLogPort {
  create(values: {
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    changes: string | null;
    created_at: number;
  }): Promise<unknown>;
}
