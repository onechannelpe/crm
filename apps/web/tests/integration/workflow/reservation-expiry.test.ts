import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { proposePendingRate } from "@tests/support/workflow/pricing";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS } from "~/server/workflow/lead/domain/pricing";
import { expireLapsedReservations } from "~/server/workflow/lead/write/expire-reservation";

// The hold window is owned by the pricing policy, not hardcoded here, so these stay
// correct if the default validity changes.
const RESERVATION_WINDOW_MS =
  DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

// The injected clock (runtime.now) governs the commands, so these tests can arm a hold,
// travel past its window, and observe expiry deterministically.
describe("lead reservation expiry", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-reservation-expiry");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("retires a lead to EXPIRED once its hold lapses and the sweep runs", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.atStage("PRICING", {
      key: "expiry-sweep",
      organization: { key: "expiry-sweep" },
    });
    await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: scenario.actor.by("backOne"),
    });

    expect(
      await expireLapsedReservations(
        { executor: runtime.ctx.db },
        runtime.now.get(),
      ),
    ).toBe(0);

    runtime.now.set(runtime.now.get() + RESERVATION_WINDOW_MS + 1);
    expect(
      await expireLapsedReservations(
        { executor: runtime.ctx.db },
        runtime.now.get(),
      ),
    ).toBe(1);

    const detail = expectOk(
      await runtime.workflow.queries.getLeadDetail({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
      }),
    );
    expect(detail.lead.stage).toBe("EXPIRED");
    expect(detail.lead.reservationExpiresAt).toBeNull();
  });

  it("rejects accepting a rate after the hold has lapsed", async () => {
    const scenario = createWorkflowScenario(runtime);
    const actor = scenario.actor.by("execOne");
    const lead = await scenario.lead.atStage("PRICING", {
      key: "expiry-accept",
      organization: { key: "expiry-accept" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: scenario.actor.by("backOne"),
    });

    runtime.now.set(runtime.now.get() + RESERVATION_WINDOW_MS + 1);

    const result = await runtime.workflow.commands.acceptRate({
      actor,
      leadId: lead.id,
      proposalId,
    });

    expect(expectErr(result).code).toBe("rate_proposal_expired");
  });
});
