import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  RateProposal,
  RateProposalOutcome,
  RateProposalRepository,
} from "~/server/workflow/application/ports/entities";

type RateProposalRow = Selectable<Database["workflow_rate_proposals"]>;
type NewRateProposalRow = Insertable<Database["workflow_rate_proposals"]>;

function toRateProposal(row: RateProposalRow): RateProposal {
  return {
    id: row.id,
    leadId: row.lead_id,
    round: row.round,
    tarifaDebito: row.tarifa_debito,
    tarifaCredito: row.tarifa_credito,
    tarifaForaneo: row.tarifa_foraneo,
    fee: row.fee,
    paybackPricing: row.payback_pricing,
    moneda: row.moneda,
    proposedBy: row.proposed_by,
    proposedAt: row.proposed_at,
    outcome: row.outcome,
    decidedAt: row.decided_at,
  };
}

export function createRateProposalRepo(
  db: DatabaseExecutor,
): RateProposalRepository {
  return {
    async insert(values: RateProposal): Promise<void> {
      await db
        .insertInto("workflow_rate_proposals")
        .values({
          id: values.id,
          lead_id: values.leadId,
          round: values.round,
          tarifa_debito: values.tarifaDebito,
          tarifa_credito: values.tarifaCredito,
          tarifa_foraneo: values.tarifaForaneo,
          fee: values.fee,
          payback_pricing: values.paybackPricing,
          moneda: values.moneda,
          proposed_by: values.proposedBy,
          proposed_at: values.proposedAt,
          outcome: values.outcome,
          decided_at: values.decidedAt,
        } satisfies NewRateProposalRow)
        .executeTakeFirstOrThrow();
    },

    async listByLeadId(leadId: string): Promise<RateProposal[]> {
      const rows = await db
        .selectFrom("workflow_rate_proposals")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("round", "asc")
        .execute();

      return rows.map(toRateProposal);
    },

    async findLatest(leadId: string): Promise<RateProposal | undefined> {
      const row = await db
        .selectFrom("workflow_rate_proposals")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("round", "desc")
        .limit(1)
        .executeTakeFirst();

      return row ? toRateProposal(row) : undefined;
    },

    async nextRound(leadId: string): Promise<number> {
      const row = await db
        .selectFrom("workflow_rate_proposals")
        .select("round")
        .where("lead_id", "=", leadId)
        .orderBy("round", "desc")
        .limit(1)
        .executeTakeFirst();

      return (row?.round ?? 0) + 1;
    },

    async markOutcome(
      id: string,
      outcome: RateProposalOutcome,
      decidedAt: number,
    ): Promise<void> {
      await db
        .updateTable("workflow_rate_proposals")
        .set({ outcome, decided_at: decidedAt })
        .where("id", "=", id)
        .execute();
    },
  };
}
