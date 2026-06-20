import type { Insertable, Selectable } from "kysely";

import type { Currency } from "~/contracts/workflow/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type RateProposalOutcome = "pending" | "accepted" | "revision_requested";

export type RateProposal = {
  id: string;
  leadId: string;
  round: number;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
  proposedBy: number;
  proposedAt: number;
  outcome: RateProposalOutcome;
  decidedAt: number | null;
};

export type RateProposalNumbers = {
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
};

export type RateProposalRepository = {
  insert(values: RateProposal): Promise<void>;
  listByLeadId(leadId: string): Promise<RateProposal[]>;
  findLatest(leadId: string): Promise<RateProposal | undefined>;
  nextRound(leadId: string): Promise<number>;
  updateNumbers(id: string, values: RateProposalNumbers): Promise<void>;
  markOutcome(
    id: string,
    outcome: RateProposalOutcome,
    decidedAt: number,
  ): Promise<void>;
};

type RateProposalRow = Selectable<Database["workflow_rate_proposals"]>;
type NewRateProposalRow = Insertable<Database["workflow_rate_proposals"]>;

function toRateProposal(row: RateProposalRow): RateProposal {
  return {
    id: row.id,
    leadId: row.lead_id,
    round: row.round,
    proposedDebitRate: row.proposed_debit_rate,
    proposedCreditRate: row.proposed_credit_rate,
    proposedForeignRate: row.proposed_foreign_rate,
    fee: row.fee,
    paybackPricing: row.payback_pricing,
    currency: row.currency,
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
          proposed_debit_rate: values.proposedDebitRate,
          proposed_credit_rate: values.proposedCreditRate,
          proposed_foreign_rate: values.proposedForeignRate,
          fee: values.fee,
          payback_pricing: values.paybackPricing,
          currency: values.currency,
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

    async updateNumbers(
      id: string,
      values: RateProposalNumbers,
    ): Promise<void> {
      await db
        .updateTable("workflow_rate_proposals")
        .set({
          proposed_debit_rate: values.proposedDebitRate,
          proposed_credit_rate: values.proposedCreditRate,
          proposed_foreign_rate: values.proposedForeignRate,
          fee: values.fee,
          payback_pricing: values.paybackPricing,
          currency: values.currency,
        })
        .where("id", "=", id)
        .execute();
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
