import { MERCHANT } from "@tests/support/database/workflow-defaults";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { seedRateProposal } from "@tests/support/database/workflow-seed";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { WorkflowRateProposalId } from "~/domain/ids";
import { createLeadQueries } from "~/server/workflow/lead/read/lead-queries";

describe("integration record export columns", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("integration-record-export-columns");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(2_000));
  });

  it("exports lead commercial snapshot and the latest quotation rates", async () => {
    const givenLead = createLeadFixtureWriter(runtime);
    const executiveId = actorBy("execOne").userId;

    const withData = await givenLead({
      kind: "pricing",
      key: "export-with-data",
      organization: { key: "export-with-data" },
      proposal: "none",
      commercial: {
        currentProvider: "Niubiz",
        currentDebitRate: 3.5,
        currentCreditRate: 4.2,
        gpv: 120_000,
        ticket: 80,
        posCount: 3,
      },
    });
    const withoutData = await givenLead({
      kind: "qualifying",
      key: "export-without-data",
      organization: { key: "export-without-data" },
    });

    // Two versions pinned to specific rounds: the export must surface the
    // highest-version (latest) rates. Proposals are direct-seeded because this is a
    // projection test, not a test of how proposals are created.
    await seedRateProposal(runtime, {
      id: WorkflowRateProposalId.trust("quote-old"),
      leadId: withData.id,
      round: 1,
      proposedDebitRate: 1.0,
      proposedCreditRate: 2.0,
      proposedForeignRate: 3.0,
      fee: 0.5,
      paybackPricing: 10,
      proposedBy: executiveId,
      outcome: "revision_requested",
      proposedAt: new Date(1_000),
      decidedAt: new Date(1_200),
    });
    await seedRateProposal(runtime, {
      id: WorkflowRateProposalId.trust("quote-latest"),
      leadId: withData.id,
      round: 2,
      proposedDebitRate: 1.5,
      proposedCreditRate: 2.5,
      proposedForeignRate: 3.5,
      fee: 0.6,
      paybackPricing: 11,
      proposedBy: executiveId,
      outcome: "pending",
      proposedAt: new Date(1_500),
      decidedAt: null,
    });

    const rows = await createLeadQueries(runtime.ctx.db).export({
      actorUserId: executiveId,
      actorRole: "superuser",
      actorBranchId: actorBy("execOne").branchId,
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
