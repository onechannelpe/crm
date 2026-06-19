import type { Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  DigitalPolicy,
  DigitalPolicyFields,
  DigitalPolicyRepository,
} from "~/server/workflow/application/ports/entities";

type DigitalPolicyRow = Selectable<Database["workflow_lead_digital_policy"]>;

function toDigitalColumns(fields: DigitalPolicyFields) {
  return {
    link_scope: fields.linkScope,
    link_url: fields.linkUrl,
    online_scope: fields.onlineScope,
    online_url: fields.onlineUrl,
    online_collection_mode: fields.onlineCollectionMode,
  };
}

function toDigitalPolicy(row: DigitalPolicyRow): DigitalPolicy {
  return {
    leadId: row.lead_id,
    linkScope: row.link_scope,
    linkUrl: row.link_url,
    onlineScope: row.online_scope,
    onlineUrl: row.online_url,
    onlineCollectionMode: row.online_collection_mode,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function createDigitalPolicyRepo(
  db: DatabaseExecutor,
): DigitalPolicyRepository {
  return {
    async findByLeadId(leadId: string): Promise<DigitalPolicy | undefined> {
      const row = await db
        .selectFrom("workflow_lead_digital_policy")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();

      return row ? toDigitalPolicy(row) : undefined;
    },

    async upsert({ leadId, fields, updatedAt, updatedBy }): Promise<void> {
      const columns = toDigitalColumns(fields);
      await db
        .insertInto("workflow_lead_digital_policy")
        .values({
          lead_id: leadId,
          ...columns,
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .onConflict((oc) =>
          oc.column("lead_id").doUpdateSet({
            ...columns,
            updated_at: updatedAt,
            updated_by: updatedBy,
          }),
        )
        .execute();
    },
  };
}
