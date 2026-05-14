import {
  makeLeadStates,
  makeNegotiationRequests,
  makeUow,
  makeWorkflowLead,
} from "@tests/support/fakes/workflow";
import { describe, expect, it, vi } from "vitest";

import { domainError } from "~/server/shared/domain-error";
import { Err } from "~/server/shared/result";
import { approveForSaleCommand } from "~/server/workflow/application/commands/approve-for-sale";
import { requestRateNegotiationCommand } from "~/server/workflow/application/commands/request-rate-negotiation";
import {
  authorizeLeadAction,
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
  resolveAvailableActions,
} from "~/server/workflow/domain/lead/policy";
import { requestRateNegotiation } from "~/server/workflow/domain/lead/transitions";
import type { LeadUnitOfWork } from "~/server/workflow/application/ports/uow";

describe("lead action policy", () => {
  it("allows supervisors and sales managers to access leads assigned to others", () => {
    const lead = makeWorkflowLead({ executiveId: 1 });

    expect(
      authorizeLeadAction("request-negotiation", { userId: 2, role: "supervisor" }, lead).ok,
    ).toBe(true);

    expect(
      authorizeLeadAction("request-negotiation", { userId: 2, role: "sales_manager" }, lead).ok,
    ).toBe(true);
  });

  it("blocks executives from approving leads assigned to others", () => {
    const result = authorizeLeadAction(
      "approve-for-sale",
      { userId: 2, role: "executive" },
      makeWorkflowLead({ executiveId: 1 }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.kind).toBe("forbidden");
  });

  it("enforces negotiation round limit via transition", () => {
    const lead = makeWorkflowLead();

    const maxRounds = requestRateNegotiation(lead, {
      actor: { userId: 1, role: "executive", branchId: 1 },
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
    const lead = makeWorkflowLead();

    const maxFiles = requestRateNegotiation(lead, {
      actor: { userId: 1, role: "executive", branchId: 1 },
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
      makeWorkflowLead(),
      { negotiationRequestCount: MAX_NEGOTIATION_ROUNDS },
    );

    expect(actions).not.toContain("request-rate-negotiation");
  });
});

describe("workflow action commands", () => {
  it("blocks approve-for-sale for executives on leads assigned to others", async () => {
    const uow = makeUow();
    const result = await approveForSaleCommand(
      {
        actor: { userId: 2, role: "executive", branchId: 1 },
        leadId: "lead-1",
      },
      {
        leads: makeLeadStates(makeWorkflowLead({ executiveId: 1 })),
        uow: uow.uow,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(uow.commit).not.toHaveBeenCalled();
  });

  it("blocks writes when negotiation file limit is exceeded", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const uow = makeUow();

    const result = await requestRateNegotiationCommand(
      {
        actor: { userId: 1, role: "executive", branchId: 1 },
        leadId: "lead-1",
        justification: "Need better rate",
        artifactIds: ["a1", "a2", "a3", "a4"],
      },
      {
        leads: makeLeadStates(makeWorkflowLead()),
        uow: uow.uow,
        negotiationRequests: negotiationRequests.repo,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(uow.commit).not.toHaveBeenCalled();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
  });

  it("does not persist negotiation records when lead mutation fails", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const uow = makeUow(
      vi.fn<LeadUnitOfWork["commit"]>(async () =>
        Err(domainError("conflict", "mutation_failed", "Mutation failed")),
      ),
    );

    const result = await requestRateNegotiationCommand(
      {
        actor: { userId: 1, role: "executive", branchId: 1 },
        leadId: "lead-1",
        justification: "Need better rate",
        artifactIds: ["a1"],
      },
      {
        leads: makeLeadStates(makeWorkflowLead()),
        uow: uow.uow,
        negotiationRequests: negotiationRequests.repo,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(uow.commit).toHaveBeenCalledOnce();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
    expect(negotiationRequests.insertFile).not.toHaveBeenCalled();
  });
});
