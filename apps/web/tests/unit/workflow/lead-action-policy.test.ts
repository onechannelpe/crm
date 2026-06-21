import { expectErr } from "@tests/support/_core/assertions";
import { describe, expect, it } from "vitest";

import {
  MAX_RATE_REVISION_FILES,
  MAX_RATE_REVISION_ROUNDS,
} from "~/contracts/workflow/limits";
import { hydrateRuc } from "~/server/shared/document";
import { requestRateRevision } from "~/server/workflow/lead/domain/decide";
import {
  authorizeLeadAction,
  resolveAvailableActions,
} from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";

function makeLeadState(overrides: Partial<LeadState> = {}): LeadState {
  return {
    id: "lead-1",
    organizationId: "org-1",
    ruc: hydrateRuc("20600000001"),
    legalName: null,
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "PRICING",
    status: null,
    priority: null,
    createdAt: 100,
    updatedAt: 100,
    deletedAt: null,
    reservationExpiresAt: null,
    version: 0,
    ...overrides,
  };
}

describe("lead action policy", () => {
  it("blocks non-owners from owner-only pricing actions", () => {
    const lead = { executiveId: 1, stage: "PRICING" } as const;

    expect(
      authorizeLeadAction(
        "request-rate-revision",
        { userId: 2, role: "executive" },
        lead,
      ).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction("accept-rate", { userId: 2, role: "executive" }, lead)
        .ok,
    ).toBe(false);
  });

  it("lets back office propose rates but not decide executive-only actions", () => {
    const lead = { executiveId: 1, stage: "PRICING" } as const;

    expect(
      authorizeLeadAction(
        "propose-rate",
        { userId: 2, role: "back_office" },
        lead,
      ).ok,
    ).toBe(true);

    expect(
      authorizeLeadAction(
        "request-rate-revision",
        { userId: 2, role: "back_office" },
        lead,
      ).ok,
    ).toBe(false);
  });

  it("keeps delete restricted to management roles", () => {
    expect(
      authorizeLeadAction("delete", { userId: 1, role: "executive" }, {
        executiveId: 1,
        stage: "PRICING",
      } as const).ok,
    ).toBe(false);

    expect(
      authorizeLeadAction("delete", { userId: 2, role: "sales_manager" }, {
        executiveId: 1,
        stage: "PRICING",
      } as const).ok,
    ).toBe(true);
  });

  it("validates rate revision document and round limits in the transition", () => {
    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: MAX_RATE_REVISION_ROUNDS + 1,
          justification: "Need better rate",
          artifactIds: ["artifact-1"],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("max_rate_revision_rounds_reached");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: [],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("rate_revision_files_required");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: Array.from(
            { length: MAX_RATE_REVISION_FILES + 1 },
            (_, index) => `artifact-${index}`,
          ),
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("max_rate_revision_files_exceeded");

    expect(
      expectErr(
        requestRateRevision(makeLeadState(), {
          actor: { userId: 1, role: "executive" },
          revisionId: "revision-1",
          round: 1,
          justification: "Need better rate",
          artifactIds: ["artifact-1", "artifact-1"],
          reservationExpiresAt: 200,
          now: 100,
        }),
      ).code,
    ).toBe("duplicate_rate_revision_file");
  });

  it("surfaces pricing actions from proposal state", () => {
    expect(
      resolveAvailableActions(
        { userId: 2, role: "back_office" },
        makeLeadState(),
        { hasActivePendingProposal: false, rateRevisionCount: 0 },
      ),
    ).toContain("propose-rate");

    const executiveActions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      { hasActivePendingProposal: true, rateRevisionCount: 0 },
    );
    expect(executiveActions).toContain("accept-rate");
    expect(executiveActions).toContain("request-rate-revision");

    expect(
      resolveAvailableActions(
        { userId: 1, role: "executive" },
        makeLeadState(),
        {
          hasActivePendingProposal: true,
          rateRevisionCount: MAX_RATE_REVISION_ROUNDS,
        },
      ),
    ).not.toContain("request-rate-revision");
  });
});
