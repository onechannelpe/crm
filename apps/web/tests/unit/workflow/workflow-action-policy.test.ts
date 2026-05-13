import {
  makeLeadReader,
  makeMutationUow,
  makeNegotiationRequests,
  makeWorkflowLead,
} from "@tests/support/fakes/workflow";
import { describe, expect, it, vi } from "vitest";

import { domainError } from "~/server/shared/domain-error";
import { Err } from "~/server/shared/result";
import { resolveAvailableActions } from "~/server/workflow/application/policies/action-availability";
import {
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
  requireLeadActionAccess,
} from "~/server/workflow/application/policies/lead-action-policy";
import type { LeadMutationUow } from "~/server/workflow/application/ports/lead-mutation-uow";
import { approveForSaleCommand } from "~/server/workflow/application/use-cases/approve-for-sale";
import { requestRateNegotiationCommand } from "~/server/workflow/application/use-cases/request-rate-negotiation";

describe("lead action policy", () => {
  it("allows supervisors and sales managers to access leads assigned to others", () => {
    const lead = makeWorkflowLead({ executiveId: 1 });

    expect(
      requireLeadActionAccess({
        action: "request-rate-negotiation",
        actorUserId: 2,
        actorRole: "supervisor",
        lead,
        negotiationRequestCount: 0,
        artifactCount: 0,
      }).ok,
    ).toBe(true);

    expect(
      requireLeadActionAccess({
        action: "request-rate-negotiation",
        actorUserId: 2,
        actorRole: "sales_manager",
        lead,
        negotiationRequestCount: 0,
        artifactCount: 0,
      }).ok,
    ).toBe(true);
  });

  it("blocks executives from approving leads assigned to others", () => {
    const result = requireLeadActionAccess({
      action: "approve-for-sale",
      actorUserId: 2,
      actorRole: "executive",
      lead: makeWorkflowLead({ executiveId: 1 }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.kind).toBe("forbidden");
  });

  it("enforces negotiation round and file limits", () => {
    const lead = makeWorkflowLead();

    const maxRounds = requireLeadActionAccess({
      action: "request-rate-negotiation",
      actorUserId: 1,
      actorRole: "executive",
      lead,
      negotiationRequestCount: MAX_NEGOTIATION_ROUNDS,
      artifactCount: 0,
    });
    expect(maxRounds.ok).toBe(false);
    if (maxRounds.ok) throw new Error("Expected failure");
    const maxRoundsError = maxRounds.error;
    expect(maxRoundsError.code).toBe("max_negotiation_rounds_reached");

    const maxFiles = requireLeadActionAccess({
      action: "request-rate-negotiation",
      actorUserId: 1,
      actorRole: "executive",
      lead,
      negotiationRequestCount: 0,
      artifactCount: MAX_NEGOTIATION_FILES + 1,
    });
    expect(maxFiles.ok).toBe(false);
    if (maxFiles.ok) throw new Error("Expected failure");
    const maxFilesError = maxFiles.error;
    expect(maxFilesError.code).toBe("max_negotiation_files_exceeded");
  });

  it("hides request negotiation when the round limit is reached", () => {
    const actions = resolveAvailableActions({
      actorUserId: 1,
      actorRole: "executive",
      lead: makeWorkflowLead(),
      negotiationRequestCount: MAX_NEGOTIATION_ROUNDS,
    });

    expect(actions).not.toContain("request-rate-negotiation");
  });
});

describe("workflow action commands", () => {
  it("blocks approve-for-sale for executives on leads assigned to others", async () => {
    const mutationUow = makeMutationUow();
    const result = await approveForSaleCommand(
      {
        leadReader: makeLeadReader(makeWorkflowLead({ executiveId: 1 })),
        mutationUow: mutationUow.uow,
        clock: { now: () => 100 },
      },
      {
        actor: { userId: 2, role: "executive", branchId: 1 },
        leadId: "lead-1",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(mutationUow.commit).not.toHaveBeenCalled();
  });

  it("validates negotiation file count before artifact lookup or writes", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const mutationUow = makeMutationUow();

    const result = await requestRateNegotiationCommand(
      {
        leadReader: makeLeadReader(makeWorkflowLead()),
        mutationUow: mutationUow.uow,
        negotiationRequests: negotiationRequests.repo,
        clock: { now: () => 100 },
      },
      {
        actor: { userId: 1, role: "executive", branchId: 1 },
        leadId: "lead-1",
        justification: "Need better rate",
        artifactIds: ["a1", "a2", "a3", "a4"],
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(
      negotiationRequests.findFileAssetIdForArtifact,
    ).not.toHaveBeenCalled();
    expect(mutationUow.commit).not.toHaveBeenCalled();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
  });

  it("does not persist negotiation records when lead mutation fails", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const mutationUow = makeMutationUow(
      vi.fn<LeadMutationUow["commit"]>(async () =>
        Err(domainError("conflict", "mutation_failed", "Mutation failed")),
      ),
    );

    const result = await requestRateNegotiationCommand(
      {
        leadReader: makeLeadReader(makeWorkflowLead()),
        mutationUow: mutationUow.uow,
        negotiationRequests: negotiationRequests.repo,
        clock: { now: () => 100 },
      },
      {
        actor: { userId: 1, role: "executive", branchId: 1 },
        leadId: "lead-1",
        justification: "Need better rate",
        artifactIds: ["a1"],
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(mutationUow.commit).toHaveBeenCalledOnce();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
    expect(negotiationRequests.insertFile).not.toHaveBeenCalled();
  });
});
