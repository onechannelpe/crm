import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import {
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/workflow/deps";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";
import { updateVenueCommand } from "~/server/workflow/lead/venue/update-venue";

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
      await createVenueCommand(
        {
          actor,
          leadId: lead.id,
          tradeName: "Local antiguo",
          posQuantity: 1,
          address: "Av. Principal 100",
          addressReference: "Primer piso",
          district: "Lima",
          province: "Lima",
          department: "Lima",
        },
        workflowCommandPorts(runtime),
      ),
    );

    const seeded = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    const venueId = seeded.venues[0].id;

    const result = await updateVenueCommand(
      {
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
      },
      workflowCommandPorts(runtime),
    );
    expectOk(result);

    const updated = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
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
    const lead = await scenario.lead.atStage("LIVE", {
      key: "venue-update-live",
      organization: { key: "venue-update-live" },
    });
    const venueId = lead.venueIds[0];

    const detail = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(detail.lead.stage).toBe("LIVE");
    expect(detail.availableActions).not.toContain("update-venue");
    const originalTradeName = detail.venues[0].tradeName;

    const result = await updateVenueCommand(
      {
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
      },
      workflowCommandPorts(runtime),
    );

    const error = expectErr(result);
    expect(error.code).toBe("invalid_stage");

    const after = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(after.venues[0].tradeName).toBe(originalTradeName);
  });
});
