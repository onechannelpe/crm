import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  CommercialProfileFields,
  DigitalPolicyFields,
  LeadProfile,
  LeadProfileRepository,
} from "~/server/workflow/application/ports/entities";

type LeadProfileRow = Selectable<Database["workflow_lead_profiles"]>;
type NewLeadProfileRow = Insertable<Database["workflow_lead_profiles"]>;

function toCommercialColumns(fields: CommercialProfileFields) {
  return {
    current_provider: fields.currentProvider,
    current_debit_rate: fields.currentDebitRate,
    current_credit_rate: fields.currentCreditRate,
    gpv: fields.gpv,
    ticket: fields.ticket,
    settlement_bank: fields.settlementBank,
    pos_count: fields.posCount,
  };
}

function toDigitalColumns(fields: DigitalPolicyFields) {
  return {
    link_scope: fields.linkScope,
    link_url: fields.linkUrl,
    online_scope: fields.onlineScope,
    online_url: fields.onlineUrl,
    online_collection_mode: fields.onlineCollectionMode,
  };
}

function toLeadProfile(row: LeadProfileRow): LeadProfile {
  return {
    leadId: row.lead_id,
    currentProvider: row.current_provider,
    currentDebitRate: row.current_debit_rate,
    currentCreditRate: row.current_credit_rate,
    gpv: row.gpv,
    ticket: row.ticket,
    linkScope: row.link_scope,
    linkUrl: row.link_url,
    onlineScope: row.online_scope,
    onlineUrl: row.online_url,
    onlineCollectionMode: row.online_collection_mode,
    settlementBank: row.settlement_bank,
    posCount: row.pos_count,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function createLeadProfileRepo(
  db: DatabaseExecutor,
): LeadProfileRepository {
  return {
    async findByLeadId(leadId: string): Promise<LeadProfile | undefined> {
      const row = await db
        .selectFrom("workflow_lead_profiles")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();

      return row ? toLeadProfile(row) : undefined;
    },

    async createCommercialProfile({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .insertInto("workflow_lead_profiles")
        .values({
          lead_id: leadId,
          ...toCommercialColumns(fields),
          link_scope: "none",
          link_url: null,
          online_scope: "none",
          online_url: null,
          online_collection_mode: null,
          updated_at: updatedAt,
          updated_by: updatedBy,
        } satisfies NewLeadProfileRow)
        .execute();
    },

    async updateCommercialScope({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .updateTable("workflow_lead_profiles")
        .set({
          ...toCommercialColumns(fields),
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .where("lead_id", "=", leadId)
        .execute();
    },

    async updateDigitalPolicy({
      leadId,
      fields,
      updatedAt,
      updatedBy,
    }): Promise<void> {
      await db
        .updateTable("workflow_lead_profiles")
        .set({
          ...toDigitalColumns(fields),
          updated_at: updatedAt,
          updated_by: updatedBy,
        })
        .where("lead_id", "=", leadId)
        .execute();
    },
  };
}
