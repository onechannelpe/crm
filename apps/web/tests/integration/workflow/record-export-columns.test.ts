import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { MERCHANT } from "@tests/support/workflow/fixtures";
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

  it("exports lead commercial snapshot and the latest quotation rates", async () => {
    const scenario = createWorkflowScenario(runtime);
    const executiveId = scenario.actor.by("execOne").userId;

    const withData = await scenario.lead.atStage("PRICING", {
      key: "export-with-data",
      organization: { key: "export-with-data" },
      commercial: {
        currentProvider: "Niubiz",
        currentDebitRate: 3.5,
        currentCreditRate: 4.2,
        gpv: 120_000,
        ticket: 80,
        posCount: 3,
      },
    });
    const withoutData = await scenario.lead.atStage("QUALIFYING", {
      key: "export-without-data",
      organization: { key: "export-without-data" },
    });

    // Two versions pinned to specific rounds: the export must surface the
    // highest-version (latest) rates. Proposals are direct-seeded because this is a
    // projection test, not a test of how proposals are created.
    await scenario.seedDirect.rateProposal({
      id: "quote-old",
      leadId: withData.id,
      round: 1,
      proposedDebitRate: 1.0,
      proposedCreditRate: 2.0,
      proposedForeignRate: 3.0,
      fee: 0.5,
      paybackPricing: 10,
      proposedBy: executiveId,
      outcome: "revision_requested",
      proposedAt: 1_000,
      decidedAt: 1_200,
    });
    await scenario.seedDirect.rateProposal({
      id: "quote-latest",
      leadId: withData.id,
      round: 2,
      proposedDebitRate: 1.5,
      proposedCreditRate: 2.5,
      proposedForeignRate: 3.5,
      fee: 0.6,
      paybackPricing: 11,
      proposedBy: executiveId,
      outcome: "pending",
      proposedAt: 1_500,
      decidedAt: null,
    });

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
      currentProvider: MERCHANT.standard.currentProvider,
      currentDebitRate: MERCHANT.standard.currentDebitRate,
      currentCreditRate: MERCHANT.standard.currentCreditRate,
      gpv: MERCHANT.standard.gpv,
      proposedDebitRate: null,
      proposedCreditRate: null,
    });
  });
});
