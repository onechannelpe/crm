import { expectErr } from "@tests/support/_core/assertions";
import { describe, expect, it } from "vitest";

import {
  MAX_RATE_REVISION_FILES,
  MAX_RATE_REVISION_ROUNDS,
} from "~/contracts/workflow/limits";
import { hydrateRuc } from "~/server/shared/document";
import {
  closeLead,
  requestRateRevision,
} from "~/server/workflow/lead/domain/decide";
import {
  authorizeFulfillmentStep,
  authorizeLeadAction,
  resolveAvailableActions,
} from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";
import { rejectRuleForStep } from "~/server/workflow/lead/fulfillment/steps";

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

  it("offers close as a third pricing outcome to the owning executive, even before a proposal", () => {
    const actions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      {
        hasActivePendingProposal: false,
        rateRevisionCount: 0,
        fulfillmentStep: null,
      },
    );
    expect(actions).toContain("close-lead");

    // Back office never closes; it only proposes.
    expect(
      resolveAvailableActions(
        { userId: 2, role: "back_office" },
        makeLeadState(),
        {
          hasActivePendingProposal: true,
          rateRevisionCount: 0,
          fulfillmentStep: null,
        },
      ),
    ).not.toContain("close-lead");
  });

  it("closes a pricing lead as lost and transitions to CLOSED_LOST", () => {
    const result = closeLead(makeLeadState(), {
      actor: { userId: 1, role: "executive" },
      reason: "RATE",
      note: "Cliente no acepta la tasa",
      now: 200,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.next.stage).toBe("CLOSED_LOST");
    expect(result.value.events.map((e) => e.eventType)).toContain(
      "lead_closed",
    );
  });

  it("rejects close outside pricing and from non-executives", () => {
    expect(
      expectErr(
        closeLead(makeLeadState({ stage: "SETUP" }), {
          actor: { userId: 1, role: "executive" },
          reason: "RATE",
          note: null,
          now: 200,
        }),
      ).code,
    ).toBe("invalid_stage");

    expect(
      closeLead(makeLeadState(), {
        actor: { userId: 2, role: "back_office" },
        reason: "RATE",
        note: null,
        now: 200,
      }).ok,
    ).toBe(false);
  });

  it("routes the transactions report to the owning executive and lets back office bounce it back", () => {
    const reportStep = "AWAITING_TRANSACTIONS_REPORT" as const;
    const state = { executiveId: 1, stage: "FULFILLMENT" } as const;

    expect(
      authorizeFulfillmentStep(
        reportStep,
        { userId: 1, role: "executive" },
        state,
      ).ok,
    ).toBe(true);
    // A different executive cannot upload another executive's report.
    expect(
      authorizeFulfillmentStep(
        reportStep,
        { userId: 2, role: "executive" },
        state,
      ).ok,
    ).toBe(false);

    // Back office reviews the report while generating the addendum and can
    // reject it back to the executive for re-upload.
    expect(rejectRuleForStep("AWAITING_ADDENDUM")?.to).toBe(reportStep);
  });

  it("surfaces pricing actions from proposal state", () => {
    expect(
      resolveAvailableActions(
        { userId: 2, role: "back_office" },
        makeLeadState(),
        {
          hasActivePendingProposal: false,
          rateRevisionCount: 0,
          fulfillmentStep: null,
        },
      ),
    ).toContain("propose-rate");

    const executiveActions = resolveAvailableActions(
      { userId: 1, role: "executive" },
      makeLeadState(),
      {
        hasActivePendingProposal: true,
        rateRevisionCount: 0,
        fulfillmentStep: null,
      },
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
          fulfillmentStep: null,
        },
      ),
    ).not.toContain("request-rate-revision");
  });
});
