import { expectErr } from "@tests/support/_core/assertions";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { runTestWorkflowCommand } from "@tests/support/workflow/command";
import { createWorkflowScenario } from "@tests/support/workflow/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  authorizeLeadAction,
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
  resolveAvailableActions,
} from "~/server/workflow/domain/lead/policy";
import type { LeadState } from "~/server/workflow/domain/lead/state";
import { requestRateNegotiation } from "~/server/workflow/domain/lead/transitions";

function makeLeadState(overrides: Partial<LeadState> = {}): LeadState {
  return {
    id: "lead-1",
    organizationId: "org-1",
    ruc: "20600000001",
    razonSocial: null,
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "QUOTED",
    status: null,
    prioridad: null,
    createdAt: 100,
    updatedAt: 100,
    version: 0,
    ...overrides,
  };
}

describe("lead action policy", () => {
  it("blocks supervisors and sales managers from owner-only lead actions", () => {
    const lead = { executiveId: 1, stage: "QUOTED" } as const;

    expect(
      authorizeLeadAction(
        "request-negotiation",
        { userId: 2, role: "supervisor" },
        lead,
      ).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction(
        "request-negotiation",
        { userId: 2, role: "sales_manager" },
        lead,
      ).ok,
    ).toBe(false);
  });

  it("blocks executives from approving leads assigned to others", () => {
    const result = authorizeLeadAction(
      "approve-for-sale",
      { userId: 2, role: "executive" },
      {
        executiveId: 1,
        stage: "QUOTED",
      } as const,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.kind).toBe("forbidden");
  });

  it("enforces negotiation round limit via transition", () => {
    const maxRounds = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: MAX_NEGOTIATION_ROUNDS + 1,
      negotiationRequestCount: MAX_NEGOTIATION_ROUNDS,
      artifactCount: 1,
      now: 100,
    });
    expect(maxRounds.ok).toBe(false);
    if (maxRounds.ok) throw new Error("Expected failure");
    expect(maxRounds.error.code).toBe("max_negotiation_rounds_reached");
  });

  it("enforces negotiation file limit via transition", () => {
    const maxFiles = requestRateNegotiation(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      negotiationRequestId: "req-1",
      round: 1,
      negotiationRequestCount: 0,
      artifactCount: MAX_NEGOTIATION_FILES + 1,
      now: 100,
    });
    expect(maxFiles.ok).toBe(false);
    if (maxFiles.ok) throw new Error("Expected failure");
    expect(maxFiles.error.code).toBe("max_negotiation_files_exceeded");
  });

  it("hides request negotiation when the round limit is reached", () => {
    const actions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      { negotiationRequestCount: MAX_NEGOTIATION_ROUNDS },
    );

    expect(actions).not.toContain("request-rate-negotiation");
  });
});

describe("workflow action commands", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-action-policy");
    runtime.now.set(1_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("blocks approve-for-sale for executives on leads assigned to others", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-approve",
      organization: { key: "policy-approve" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.approveForSale({
        actor: scenario.actor.by("execTwo"),
        leadId: lead.id,
      }),
    );

    expectErr(result);
    const row = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["stage"])
      .where("id", "=", lead.id)
      .executeTakeFirstOrThrow();
    expect(row.stage).toBe("QUOTED");
  });

  it("blocks rate negotiation when no files are attached and does not persist requests", async () => {
    const scenario = createWorkflowScenario(runtime);
    const lead = await scenario.lead.assignedTo("execOne", {
      key: "policy-negotiation",
      organization: { key: "policy-negotiation" },
      stage: "QUOTED",
      createdAt: 10,
      updatedAt: 10,
    });

    const result = await runTestWorkflowCommand(runtime, (commandApi) =>
      commandApi.requestRateNegotiation({
        actor: scenario.actor.by("execOne"),
        leadId: lead.id,
        justification: "Need better rate",
        artifactIds: [],
      }),
    );

    expectErr(result);
    const rows = await runtime.ctx.db
      .selectFrom("workflow_negotiation_requests")
      .select(["id"])
      .where("lead_id", "=", lead.id)
      .execute();
    expect(rows).toHaveLength(0);
  });
});
