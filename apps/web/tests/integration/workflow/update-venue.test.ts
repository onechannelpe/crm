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

  it("updates venue fields during setup execution", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "venue-update",
      organization: { key: "venue-update" },
      stage: "SETUP_EXECUTION",
      createdAt: 10,
      updatedAt: 10,
    });
    await seedVenue({
      leadId: lead.id,
      venueId: "venue-update-1",
      nombreComercial: "Local antiguo",
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.updateVenue({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        venueId: "venue-update-1",
        nombreComercial: "Local corregido",
        posQuantity: 3,
        direccion: "Av. Nueva 123",
        referencia: "Frente al parque",
        distrito: "Miraflores",
        provincia: "Lima",
        departamento: "Lima",
      }),
    );

    expectOk(result);
    const venue = await runtime.ctx.db
      .selectFrom("workflow_lead_venues")
      .selectAll()
      .where("id", "=", "venue-update-1")
      .executeTakeFirstOrThrow();
    expect(venue.nombre_comercial).toBe("Local corregido");
    expect(venue.pos_quantity).toBe(3);
    expect(venue.direccion).toBe("Av. Nueva 123");

    const event = await runtime.ctx.db
      .selectFrom("workflow_history_events")
      .select(["event_type", "payload_json"])
      .where("lead_id", "=", lead.id)
      .where("event_type", "=", "venue_updated")
      .executeTakeFirstOrThrow();
    expect(event.payload_json).toContain("Local corregido");
  });

  it("blocks venue updates after setup execution", async () => {
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
      nombreComercial: "Local final",
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
        nombreComercial: "Local cambiado",
        posQuantity: 4,
        direccion: "Av. Cambio 456",
        referencia: "Esquina",
        distrito: "San Isidro",
        provincia: "Lima",
        departamento: "Lima",
      }),
    );

    expectErr(result);
    const venue = await runtime.ctx.db
      .selectFrom("workflow_lead_venues")
      .select(["nombre_comercial", "pos_quantity"])
      .where("id", "=", "venue-update-live-1")
      .executeTakeFirstOrThrow();
    expect(venue.nombre_comercial).toBe("Local final");
    expect(venue.pos_quantity).toBe(1);
  });

  async function seedVenue(input: {
    leadId: string;
    venueId: string;
    nombreComercial: string;
  }) {
    await runtime.ctx.db
      .insertInto("workflow_lead_venues")
      .values({
        id: input.venueId,
        lead_id: input.leadId,
        nombre_comercial: input.nombreComercial,
        pos_quantity: 1,
        link_url: null,
        online_url: null,
        online_modalidad: null,
        direccion: "Av. Principal 100",
        referencia: "Primer piso",
        distrito: "Lima",
        provincia: "Lima",
        departamento: "Lima",
        created_at: 10,
        created_by: 1,
      })
      .executeTakeFirstOrThrow();
  }
});
