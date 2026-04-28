import { describe, expect, it, vi } from "vitest";

import { domainError } from "~/server/shared/domain-error";
import { Err, Ok } from "~/server/shared/result";
import { approveForSaleCommand } from "~/server/workflow/application/command-api/approve-for-sale";
import { requestRateNegotiationCommand } from "~/server/workflow/application/command-api/request-rate-negotiation";
import { resolveAvailableActions } from "~/server/workflow/application/policies/action-availability";
import {
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
  requireLeadActionAccess,
} from "~/server/workflow/application/policies/lead-action-policy";
import type {
  LeadMutationOutcome,
  LeadMutationUow,
} from "~/server/workflow/application/ports/lead-mutation-uow";
import type { NegotiationRequestRepository } from "~/server/workflow/application/ports/negotiation-request-repository";
import type { LeadRecord } from "~/server/workflow/domain/lead-record";
import type { LeadReadRepository } from "~/server/workflow/ports/lead-read-repository";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    ruc: "20100000001",
    razonSocial: "Org Test",
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "QUOTED",
    status: null,
    prioridad: null,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  };
}

function makeLeadReader(lead: LeadRecord): LeadReadRepository {
  return {
    findById: async () => lead,
  };
}

function makeMutationUow(commit?: LeadMutationUow["commit"]): LeadMutationUow {
  const defaultCommit: LeadMutationUow["commit"] = vi.fn(async () =>
    Ok({
      events: {
        history: [],
        audit: { action: "test", entityId: "lead-1", changes: {} },
      },
      historyIds: [],
    } satisfies LeadMutationOutcome),
  );

  return {
    commit: commit ?? defaultCommit,
    commitChecked: vi.fn(),
    derivePatch: vi.fn(),
  } as unknown as LeadMutationUow;
}

function makeNegotiationRequests(
  overrides: Partial<NegotiationRequestRepository> = {},
): NegotiationRequestRepository {
  return {
    insert: vi.fn(),
    insertFile: vi.fn(),
    findFileAssetIdForArtifact: vi.fn(async () => 10),
    countByLeadId: vi.fn(async () => 0),
    listByLeadId: vi.fn(),
    ...overrides,
  };
}

describe("lead action policy", () => {
  it("allows supervisors and sales managers to access leads assigned to others", () => {
    const lead = makeLead({ executiveId: 1 });

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
      lead: makeLead({ executiveId: 1 }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("forbidden");
  });

  it("enforces negotiation round and file limits", () => {
    const lead = makeLead();

    const maxRounds = requireLeadActionAccess({
      action: "request-rate-negotiation",
      actorUserId: 1,
      actorRole: "executive",
      lead,
      negotiationRequestCount: MAX_NEGOTIATION_ROUNDS,
      artifactCount: 0,
    });
    expect(maxRounds.ok).toBe(false);
    if (maxRounds.ok) return;
    expect(maxRounds.error.code).toBe("max_negotiation_rounds_reached");

    const maxFiles = requireLeadActionAccess({
      action: "request-rate-negotiation",
      actorUserId: 1,
      actorRole: "executive",
      lead,
      negotiationRequestCount: 0,
      artifactCount: MAX_NEGOTIATION_FILES + 1,
    });
    expect(maxFiles.ok).toBe(false);
    if (maxFiles.ok) return;
    expect(maxFiles.error.code).toBe("max_negotiation_files_exceeded");
  });

  it("hides request negotiation when the round limit is reached", () => {
    const actions = resolveAvailableActions({
      actorUserId: 1,
      actorRole: "executive",
      lead: makeLead(),
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
        leadReader: makeLeadReader(makeLead({ executiveId: 1 })),
        mutationUow,
        notificationCenter: {
          notifyUsers: vi.fn(),
          notifyBranchRoles: vi.fn(),
        },
        clock: { now: () => 100 },
      },
      {
        actor: { userId: 2, role: "executive", branchId: 1 },
        leadId: "lead-1",
      },
    );

    expect(result.ok).toBe(false);
    expect(mutationUow.commit).not.toHaveBeenCalled();
  });

  it("validates negotiation file count before artifact lookup or writes", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const mutationUow = makeMutationUow();

    const result = await requestRateNegotiationCommand(
      {
        leadReader: makeLeadReader(makeLead()),
        mutationUow,
        negotiationRequests,
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
    expect(
      negotiationRequests.findFileAssetIdForArtifact,
    ).not.toHaveBeenCalled();
    expect(mutationUow.commit).not.toHaveBeenCalled();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
  });

  it("does not persist negotiation records when lead mutation fails", async () => {
    const negotiationRequests = makeNegotiationRequests();
    const mutationUow = makeMutationUow(
      vi.fn(async () =>
        Err(domainError("conflict", "mutation_failed", "Mutation failed")),
      ),
    );

    const result = await requestRateNegotiationCommand(
      {
        leadReader: makeLeadReader(makeLead()),
        mutationUow,
        negotiationRequests,
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
    expect(mutationUow.commit).toHaveBeenCalledOnce();
    expect(negotiationRequests.insert).not.toHaveBeenCalled();
    expect(negotiationRequests.insertFile).not.toHaveBeenCalled();
  });
});
