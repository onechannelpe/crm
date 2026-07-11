import { describe, expect, it, vi } from "vitest";

import { createIntentExpander } from "~/server/notifications/expansion/expand-intent";
import type { RecipientPlan } from "~/server/notifications/expansion/plan-recipients";
import type { IntentJob } from "~/server/notifications/repos/intent-repo";
import { NotificationIntentId, UserId } from "~/server/shared/ids";

const NOW = new Date(5_000);

function intentJob(overrides: Partial<IntentJob> = {}): IntentJob {
  return {
    id: NotificationIntentId.trust("intent-1"),
    attempt_count: 1,
    max_attempts: 5,
    event_type: "lead.ready_for_sale",
    audience_json: {
      kind: "user_ids",
      userIds: ["1", "2"],
    },
    channels_json: ["in_app", "whatsapp"],
    priority: "normal",
    title: "Title",
    body_text: "Body",
    action_url: "/records/1",
    ...overrides,
  };
}

function createExpander(plan: RecipientPlan) {
  const createMany = vi.fn<() => Promise<void>>(async () => undefined);
  const insertPlanned = vi.fn<() => Promise<void>>(async () => undefined);
  const expandIntent = createIntentExpander({
    planRecipients: async () => plan,
    appNotifications: { createMany },
    deliveries: { insertPlanned },
    logger: { info: vi.fn<() => void>() },
  });
  return { createMany, insertPlanned, expandIntent };
}

describe("createIntentExpander", () => {
  it("writes in-app rows and delivery rows for the planned recipients", async () => {
    const { expandIntent, createMany, insertPlanned } = createExpander({
      inAppRecipients: [UserId.trust("1"), UserId.trust("2")],
      externalDeliveries: [
        {
          userId: UserId.trust("1"),
          channel: "whatsapp",
          recipientAddress: "51911000001",
        },
      ],
    });

    const outcome = await expandIntent(intentJob(), NOW);

    expect(outcome).toEqual({ kind: "expanded", deliveriesPlanned: 1 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: UserId.trust("1"),
        source_event_id: NotificationIntentId.trust("intent-1"),
        event_type: "lead.ready_for_sale",
        title: "Title",
        action_url: "/records/1",
        created_at: NOW,
      }),
      expect.objectContaining({
        user_id: UserId.trust("2"),
        source_event_id: NotificationIntentId.trust("intent-1"),
      }),
    ]);
    expect(insertPlanned).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          intent_id: NotificationIntentId.trust("intent-1"),
          user_id: UserId.trust("1"),
          channel: "whatsapp",
          recipient_address: "51911000001",
        }),
      ],
      NOW,
    );
  });

  it("writes in-app rows even when no external deliveries are planned", async () => {
    const { expandIntent, createMany, insertPlanned } = createExpander({
      inAppRecipients: [UserId.trust("1")],
      externalDeliveries: [],
    });

    const outcome = await expandIntent(
      intentJob({ channels_json: ["in_app"] }),
      NOW,
    );

    expect(outcome).toEqual({ kind: "expanded", deliveriesPlanned: 0 });
    expect(createMany).toHaveBeenCalledOnce();
    expect(insertPlanned).toHaveBeenCalledWith([], NOW);
  });

  it("returns invalid for a malformed payload before any write", async () => {
    const { expandIntent, createMany, insertPlanned } = createExpander({
      inAppRecipients: [UserId.trust("1")],
      externalDeliveries: [],
    });

    const outcome = await expandIntent(
      intentJob({ channels_json: ["in_app", "sms"] }),
      NOW,
    );

    expect(outcome.kind).toBe("invalid");
    expect(createMany).not.toHaveBeenCalled();
    expect(insertPlanned).not.toHaveBeenCalled();
  });
});
