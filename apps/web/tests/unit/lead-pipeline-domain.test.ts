import { describe, expect, it } from "vitest";

import { resolveLeadAvailableActions } from "../../src/server/lead-pipeline/domain/lead";
import {
  describeLeadCallOutcome,
  formatLeadActorName,
} from "../../src/server/lead-pipeline/domain/lead-interaction";

describe("lead pipeline domain helpers", () => {
  it("masks actor display names for non-privileged users", () => {
    expect(
      formatLeadActorName(
        {
          names: "Luis Alberto",
          first_surname: "Diaz",
          second_surname: "Salas",
        },
        false,
      ),
    ).toBe("Luis D.");
  });

  it("returns full actor display names for privileged users", () => {
    expect(
      formatLeadActorName(
        {
          names: "Luis Alberto",
          first_surname: "Diaz",
          second_surname: "Salas",
        },
        true,
      ),
    ).toBe("Luis Alberto Diaz Salas");
  });

  it("exposes only the actions allowed for the actor and stage", () => {
    expect(
      resolveLeadAvailableActions({
        stage: "NEEDS_EXECUTIVE_INPUT",
        canLogTimeline: true,
        canCompleteCommercialInput: true,
        canCreateSale: false,
        canReviewLead: false,
        canCreateQuotation: false,
        canApproveForSale: false,
        canReassignLead: false,
      }),
    ).toEqual(["log-call", "add-note", "complete-commercial-input"]);

    expect(
      resolveLeadAvailableActions({
        stage: "READY_FOR_SALE",
        canLogTimeline: false,
        canCompleteCommercialInput: false,
        canCreateSale: true,
        canReviewLead: false,
        canCreateQuotation: false,
        canApproveForSale: false,
        canReassignLead: false,
      }),
    ).toEqual(["create-sale"]);
  });

  it("describes call outcomes with user-facing labels", () => {
    expect(describeLeadCallOutcome("callback_requested")).toBe(
      "Pidió devolución",
    );
  });
});
