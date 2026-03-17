import { sql } from "kysely";
import type { Kysely } from "kysely";

export async function run<T>(db: Kysely<T>): Promise<void> {
  const epoch = 0;

  await sql`
    INSERT OR IGNORE INTO audit_action_policies (
      action,
      risk_level,
      is_active,
      is_protected,
      updated_by_user_id,
      created_at,
      updated_at
    ) VALUES
      ('all_sessions_revoked', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('session_revoked_by_admin', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('product_updated', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('sales_record_confirmed', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('sales_record_rejected', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('search_allowance_granted', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('lead_refill_granted', 'high', 1, 1, NULL, ${epoch}, ${epoch}),
      ('rate_limit_exceeded', 'high', 1, 1, NULL, ${epoch}, ${epoch})
  `.execute(db);
}
