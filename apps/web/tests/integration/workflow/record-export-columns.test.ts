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
        proveedor_actual: "Niubiz",
        tasa_debito_actual: 3.5,
        tasa_credito_actual: 4.2,
        gpv: 120_000,
        ticket: 80,
        abono_bank: "BCP",
        pos_total: 3,
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
          tarifa_debito: 1.0,
          tarifa_credito: 2.0,
          tarifa_foraneo: 3.0,
          fee: 0.5,
          moneda: "PEN",
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
          tarifa_debito: 1.5,
          tarifa_credito: 2.5,
          tarifa_foraneo: 3.5,
          fee: 0.6,
          moneda: "PEN",
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
      proveedorActual: "Niubiz",
      tasaDebitoActual: 3.5,
      tasaCreditoActual: 4.2,
      gpv: 120_000,
      tarifaDebitoCulqi: 1.5,
      tarifaCreditoCulqi: 2.5,
    });

    const bare = rows.find((row) => row.id === withoutData.id);
    expect(bare).toMatchObject({
      proveedorActual: null,
      tasaDebitoActual: null,
      tasaCreditoActual: null,
      gpv: null,
      tarifaDebitoCulqi: null,
      tarifaCreditoCulqi: null,
    });
  });
});
