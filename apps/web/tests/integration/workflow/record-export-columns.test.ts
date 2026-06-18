import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("integration record export columns", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("integration-record-export-columns");
    runtime.now.set(2_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("exports commercial profile and the latest quotation rates", async () => {
    const scenario = createWorkflowScenario(runtime);
    const executiveId = scenario.actor.by("execOne").userId;

    const withData = await scenario.lead.assignedTo("execOne", {
      key: "export-with-data",
      organization: { key: "export-with-data" },
      stage: "PRICING",
    });
    const withoutData = await scenario.lead.assignedTo("execOne", {
      key: "export-without-data",
      organization: { key: "export-without-data" },
      stage: "QUALIFYING",
    });

    await runtime.ctx.db
      .insertInto("workflow_lead_profiles")
      .values({
        lead_id: withData.id,
        current_provider: "Niubiz",
        current_debit_rate: 3.5,
        current_credit_rate: 4.2,
        gpv: 120_000,
        ticket: 80,
        settlement_bank: "BCP",
        pos_count: 3,
        link_scope: "none",
        online_scope: "none",
        updated_at: 1_000,
        updated_by: executiveId,
      })
      .execute();

    // Two versions: the export must surface the highest-version (latest) rates.
    await runtime.ctx.db
      .insertInto("workflow_rate_proposals")
      .values([
        {
          id: "quote-old",
          lead_id: withData.id,
          payback_pricing: 10,
          proposed_debit_rate: 1.0,
          proposed_credit_rate: 2.0,
          proposed_foreign_rate: 3.0,
          fee: 0.5,
          currency: "PEN",
          round: 1,
          proposed_at: 1_000,
          proposed_by: executiveId,
          outcome: "revision_requested",
          decided_at: 1_200,
        },
        {
          id: "quote-latest",
          lead_id: withData.id,
          payback_pricing: 11,
          proposed_debit_rate: 1.5,
          proposed_credit_rate: 2.5,
          proposed_foreign_rate: 3.5,
          fee: 0.6,
          currency: "PEN",
          round: 2,
          proposed_at: 1_500,
          proposed_by: executiveId,
          outcome: "pending",
          decided_at: null,
        },
      ])
      .execute();

    const rows = await runtime.integrations.recordExportQuery.export({
      actorUserId: executiveId,
      actorRole: "superuser",
      actorBranchId: 1,
    });

    const enriched = rows.find((row) => row.id === withData.id);
    expect(enriched).toMatchObject({
      currentProvider: "Niubiz",
      currentDebitRate: 3.5,
      currentCreditRate: 4.2,
      gpv: 120_000,
      proposedDebitRate: 1.5,
      proposedCreditRate: 2.5,
    });

    const bare = rows.find((row) => row.id === withoutData.id);
    expect(bare).toMatchObject({
      currentProvider: null,
      currentDebitRate: null,
      currentCreditRate: null,
      gpv: null,
      proposedDebitRate: null,
      proposedCreditRate: null,
    });
  });
});
