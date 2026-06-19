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
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "venue-update",
      organization: { key: "venue-update" },
      stage: "SETUP",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedVenue({
      leadId: lead.id,
      venueId: "venue-update-1",
      tradeName: "Local antiguo",
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.updateVenue({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        venueId: "venue-update-1",
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
    const venue = await runtime.ctx.db
      .selectFrom("workflow_lead_venues")
      .selectAll()
      .where("id", "=", "venue-update-1")
      .executeTakeFirstOrThrow();
    expect(venue.trade_name).toBe("Local corregido");
    expect(venue.pos_quantity).toBe(3);
    expect(venue.address).toBe("Av. Nueva 123");

    const event = await runtime.ctx.db
      .selectFrom("events")
      .select(["type", "payload_json"])
      .where("entity_type", "=", "lead")
      .where("entity_id", "=", lead.id)
      .where("type", "=", "venue_updated")
      .executeTakeFirstOrThrow();
    expect(event.payload_json).toContain("Local corregido");
  });

  it("blocks venue updates after setup", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "venue-update-live",
      organization: { key: "venue-update-live" },
      stage: "LIVE",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedVenue({
      leadId: lead.id,
      venueId: "venue-update-live-1",
      tradeName: "Local final",
    });

    const detail = await runtime.workflow.queries.getLeadDetail({
      actor: scenario.actor.by("execOne"),
      leadId: lead.id,
    });
    const detailValue = expectOk(detail);
    expect(detailValue.availableActions).not.toContain("update-venue");

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.updateVenue({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        venueId: "venue-update-live-1",
        tradeName: "Local cambiado",
        posQuantity: 4,
        address: "Av. Cambio 456",
        addressReference: "Esquina",
        district: "San Isidro",
        province: "Lima",
        department: "Lima",
      }),
    );

    expectErr(result);
    const venue = await runtime.ctx.db
      .selectFrom("workflow_lead_venues")
      .select(["trade_name", "pos_quantity"])
      .where("id", "=", "venue-update-live-1")
      .executeTakeFirstOrThrow();
    expect(venue.trade_name).toBe("Local final");
    expect(venue.pos_quantity).toBe(1);
  });

  async function seedVenue(input: {
    leadId: string;
    venueId: string;
    tradeName: string;
  }) {
    await runtime.ctx.db
      .insertInto("workflow_lead_venues")
      .values({
        id: input.venueId,
        lead_id: input.leadId,
        trade_name: input.tradeName,
        pos_quantity: 1,
        link_url: null,
        online_url: null,
        online_collection_mode: null,
        address: "Av. Principal 100",
        address_reference: "Primer piso",
        district: "Lima",
        province: "Lima",
        department: "Lima",
        created_at: 10,
        created_by: 1,
      })
      .executeTakeFirstOrThrow();
  }
});
