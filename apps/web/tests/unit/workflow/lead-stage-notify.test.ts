import { describe, expect, it } from "vitest";

import { BranchId, UserId } from "~/server/shared/ids";
import { deriveLeadStageNotifications } from "~/server/workflow/effects/reactors/notify";

const baseInput = {
  eventId: "evt-1",
  leadId: "lead-1",
  ruc: "20123456789",
  executiveId: UserId.trust("42"),
  branchId: BranchId.trust("1"),
};

describe("deriveLeadStageNotifications", () => {
  it("emits an in-app + WhatsApp intent when the lead moves to SETUP", () => {
    const intents = deriveLeadStageNotifications({
      ...baseInput,
      toStage: "SETUP",
    });

    expect(intents).toHaveLength(1);
    const [intent] = intents;
    if (!intent) throw new Error("expected one intent");

    expect(intent.eventType).toBe("lead.ready_for_sale");
    expect(intent.audience).toEqual({
      kind: "user_ids",
      userIds: [baseInput.executiveId],
    });
    expect(intent.channels).toEqual(["in_app", "whatsapp"]);
    expect(intent.priority).toBe("high");
    expect(intent.title).toBe("Cliente listo para afiliación");
    expect(intent.bodyText).toContain("20123456789");
    expect(intent.actionUrl).toBe("/records/lead-1");
  });

  it("emits an in-app only intent when the lead moves to PRICING", () => {
    // ready_for_quotation targets a branch role (group fan-out). Keeping it
    // in-app only avoids waking every back-office user via WhatsApp.
    const intents = deriveLeadStageNotifications({
      ...baseInput,
      toStage: "PRICING",
    });

    expect(intents).toHaveLength(1);
    const [intent] = intents;
    if (!intent) throw new Error("expected one intent");

    expect(intent.eventType).toBe("lead.ready_for_quotation");
    expect(intent.audience).toEqual({
      kind: "branch_role",
      branchId: baseInput.branchId,
      role: "back_office",
    });
    expect(intent.channels).toEqual(["in_app"]);
    expect(intent.priority).toBe("normal");
  });

  it("emits no intents for stages that don't need hand-off notifications", () => {
    expect(
      deriveLeadStageNotifications({ ...baseInput, toStage: "QUALIFYING" }),
    ).toEqual([]);
    expect(
      deriveLeadStageNotifications({ ...baseInput, toStage: "FULFILLMENT" }),
    ).toEqual([]);
    expect(
      deriveLeadStageNotifications({ ...baseInput, toStage: "LIVE" }),
    ).toEqual([]);
  });

  it("omits the PRICING intent when the lead has no branch assigned", () => {
    // branch_role audience needs a branchId; without one the reactor must not
    // emit a half-formed intent.
    const intents = deriveLeadStageNotifications({
      ...baseInput,
      branchId: null,
      toStage: "PRICING",
    });

    expect(intents).toEqual([]);
  });
});
