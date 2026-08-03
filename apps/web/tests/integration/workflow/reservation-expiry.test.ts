import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { proposePendingRate } from "@tests/support/integration/pricing";
import { operationAt } from "@tests/support/operation";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { expireLapsedReservations } from "~/server/workflow/lead/commands/expire-reservation";
import { DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS } from "~/server/workflow/lead/domain/pricing";

// The hold window is owned by the pricing policy, not hardcoded here, so these stay
// correct if the default validity changes.
const RESERVATION_WINDOW_MS =
  DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

// The injected clock (runtime.now) governs the commands, so these tests can arm a hold,
// travel past its window, and observe expiry deterministically.
describe("lead reservation expiry", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-reservation-expiry");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(1_000));
  });

  it("retires a lead to EXPIRED once its hold lapses and the sweep runs", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "expiry-sweep",
      organization: { key: "expiry-sweep" },
    });
    await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });

    expect(
      await expireLapsedReservations(
        { executor: runtime.ctx.db },
        runtime.now.get(),
      ),
    ).toBe(0);

    runtime.now.set(
      new Date(runtime.now.get().getTime() + RESERVATION_WINDOW_MS + 1),
    );
    expect(
      await expireLapsedReservations(
        { executor: runtime.ctx.db },
        runtime.now.get(),
      ),
    ).toBe(1);

    const actor = actorBy("execOne");
    const detail = expectOk(
      await runtime.workflow.queries.getLeadDetail(
        {
          actorUserId: actor.userId,
          actorRole: actor.role,
          leadId: lead.id,
        },
        operationAt(runtime.now.get()),
      ),
    );
    expect(detail.lead.stage).toBe("EXPIRED");
    expect(detail.lead.reservationExpiresAt).toBeNull();
  });

  it("rejects accepting a rate after the hold has lapsed", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "expiry-accept",
      organization: { key: "expiry-accept" },
    });
    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });

    runtime.now.set(
      new Date(runtime.now.get().getTime() + RESERVATION_WINDOW_MS + 1),
    );

    const result = await runtime.workflow.commands.acceptRate(
      {
        actor,
        leadId: lead.id,
        proposalId,
      },
      operationAt(runtime.now.get()),
    );

    expect(expectErr(result).code).toBe("rate_proposal_expired");
  });
});
