import { describe, expect, it } from "vitest";

import { BranchId, EventId, UserId } from "~/domain/ids";
import { buildLeadStageIntent } from "~/server/notifications/policy/lead-stage";
import type { NotificationPolicyEvent } from "~/server/notifications/policy/types";

const executiveId = UserId.trust("42");
const branchId = BranchId.trust("1");
const ruc = "20123456789";

function stageChangedEvent(
  overrides: Partial<NotificationPolicyEvent> = {},
): NotificationPolicyEvent {
  return {
    eventId: EventId.trust("evt-1"),
    entityId: "lead-1",
    actorUserId: executiveId,
    subjectUserId: null,
    occurredAt: new Date(0),
    payload: { from: "PRICING", to: "SETUP" },
    notificationContext: { ruc, executiveId, branchId },
    ...overrides,
  };
}

describe("buildLeadStageIntent", () => {
  it("notifies the owning executive when a lead reaches SETUP", () => {
    const intent = buildLeadStageIntent(stageChangedEvent());

    expect(intent).toMatchObject({
      eventType: "lead.ready_for_sale",
      audience: { kind: "user_ids", userIds: [executiveId] },
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Cliente listo para afiliación",
      actionUrl: "/records/lead-1",
    });

    expect(intent?.bodyText).toContain(ruc);
  });

  it("notifies back office in-app when a lead reaches PRICING", () => {
    const intent = buildLeadStageIntent(
      stageChangedEvent({
        payload: { from: "QUALIFYING", to: "PRICING" },
      }),
    );

    expect(intent).toMatchObject({
      eventType: "lead.ready_for_quotation",
      audience: { kind: "branch_role", branchId, role: "back_office" },

      // Avoid WhatsApp fan-out to every back-office user in the branch.
      channels: ["in_app"],

      priority: "normal",
    });
  });

  it("returns no intent for stage changes without a handoff", () => {
    for (const to of ["QUALIFYING", "FULFILLMENT", "LIVE"] as const) {
      expect(
        buildLeadStageIntent(
          stageChangedEvent({
            payload: { from: "PRICING", to },
          }),
        ),
      ).toBeNull();
    }
  });

  it("ignores events without a stage-change payload", () => {
    expect(
      buildLeadStageIntent(
        stageChangedEvent({
          payload: { note: "hi" },
        }),
      ),
    ).toBeNull();
  });

  it("ignores events with an invalid notification context", () => {
    expect(
      buildLeadStageIntent(
        stageChangedEvent({
          notificationContext: null,
        }),
      ),
    ).toBeNull();
  });
});
