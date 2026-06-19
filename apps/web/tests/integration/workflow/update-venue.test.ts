import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("update venue", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-update-venue");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("updates venue fields during setup", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("SETUP", {
      key: "venue-update",
      organization: { key: "venue-update" },
    });

    expectOk(
      await runTestWorkflowCommand(runtime, (commandApi) =>
        commandApi.createVenue({
          actor,
          leadId: lead.id,
          tradeName: "Local antiguo",
          posQuantity: 1,
          address: "Av. Principal 100",
          addressReference: "Primer piso",
          district: "Lima",
          province: "Lima",
          department: "Lima",
        }),
      ),
    );

    const seeded = expectOk(
      await runtime.workflow.queries.getLeadDetail({ actor, leadId: lead.id }),
    );
    const venueId = seeded.venues[0].id;

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.updateVenue({
        actor,
        leadId: lead.id,
        venueId,
        tradeName: "Local corregido",
        posQuantity: 3,
        address: "Av. Nueva 123",
        addressReference: "Frente al parque",
        district: "Miraflores",
        province: "Lima",
        department: "Lima",
      }),
    );
    expectOk(result);

    const updated = expectOk(
      await runtime.workflow.queries.getLeadDetail({ actor, leadId: lead.id }),
    );
    expect(updated.venues[0]).toMatchObject({
      tradeName: "Local corregido",
      posQuantity: 3,
      address: "Av. Nueva 123",
    });
  });

  it("blocks venue updates after setup", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    // atStage("LIVE") reaches LIVE the only way production can: a venue with
    // completed accounts. No way to construct the impossible "LIVE with an
    // accountless venue" state the old direct seed produced.
    const lead = await scenario.lead.atStage("LIVE", {
      key: "venue-update-live",
      organization: { key: "venue-update-live" },
    });
    const venueId = lead.venueIds[0];

    const detail = expectOk(
      await runtime.workflow.queries.getLeadDetail({ actor, leadId: lead.id }),
    );
    expect(detail.lead.stage).toBe("LIVE");
    expect(detail.availableActions).not.toContain("update-venue");
    const originalTradeName = detail.venues[0].tradeName;

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.updateVenue({
        actor,
        leadId: lead.id,
        venueId,
        tradeName: "Local cambiado",
        posQuantity: 4,
        address: "Av. Cambio 456",
        addressReference: "Esquina",
        district: "San Isidro",
        province: "Lima",
        department: "Lima",
      }),
    );

    const error = expectErr(result);
    expect(error.code).toBe("invalid_stage");

    const after = expectOk(
      await runtime.workflow.queries.getLeadDetail({ actor, leadId: lead.id }),
    );
    expect(after.venues[0].tradeName).toBe(originalTradeName);
  });
});
