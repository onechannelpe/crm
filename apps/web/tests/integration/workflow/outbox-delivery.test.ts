import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { createTestNotificationRuntime } from "@tests/support/integration/notification-runtime";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { NotificationIntentId } from "~/domain/ids";

describe("outbox delivery", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("outbox-delivery");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(2_000));
  });

  it("marks rows with malformed channels as failed", async () => {
    await runtime.ctx.db
      .insertInto("notification_intents")
      .values({
        id: NotificationIntentId.trust("test-malformed-channels"),
        event_type: "test.malformed",
        audience_json: {
          kind: "user_ids",
          userIds: [actorBy("execOne").userId],
        },
        channels_json: JSON.stringify(["in_app", "sms"]),
        title: "should fail",
        body_text: "unsupported channel",
        action_url: null,
        priority: "normal",
        queue_state: "pending",
        attempt_count: 0,
        max_attempts: 5,
        claimable_at: new Date(0),
        lease_owner: null,
        error_message: null,
        created_at: new Date(0),
        completed_at: null,
      })
      .execute();

    await createTestNotificationRuntime(runtime).drain();

    const failed = await runtime.ctx.db
      .selectFrom("notification_intents")
      .select(["queue_state", "error_message", "completed_at"])
      .where("id", "=", NotificationIntentId.trust("test-malformed-channels"))
      .executeTakeFirstOrThrow();

    expect(failed.queue_state).toBe("failed");
    expect(failed.error_message).toContain(
      "Invalid notification channels payload",
    );
    expect(failed.completed_at).toEqual(runtime.now.get());
  });

  it("drains pending outbox events and persists notifications", async () => {
    const givenLead = createLeadFixtureWriter(runtime);
    const importer = createWorkflowImporter({
      runtime,
    });
    const leadOne = await givenLead({
      kind: "qualifying",
      key: "delivery-one",
      organization: { key: "delivery-one" },
      status: "DISPONIBLE",
      priority: "P1",
    });
    const leadTwo = await givenLead({
      kind: "qualifying",
      executive: "execTwo",
      key: "delivery-two",
      organization: { key: "delivery-two" },
      status: "SIN RESULTADO",
      priority: "P1",
    });

    await importer.run({
      actor: "superuser",
      rows: [
        { type: "priority", lead: leadOne, priority: "SIN RESULTADO" },
        { type: "status", lead: leadTwo, status: "DISPONIBLE" },
      ],
    });

    const notificationsRuntime = createTestNotificationRuntime(runtime);
    await notificationsRuntime.drain();

    const reader = createNotificationReader(runtime);
    const notifications = await reader.appNotifications();
    expect(notifications).toEqual([
      {
        user_id: actorBy("backOne").userId,
        event_type: "lead.ready_for_quotation",
        intent_id: expect.stringContaining(":ready_pricing"),
      },
      {
        user_id: actorBy("backTwo").userId,
        event_type: "lead.ready_for_quotation",
        intent_id: expect.stringContaining(":ready_pricing"),
      },
    ]);

    const intents = await reader.intents();
    expect(
      intents.filter(({ queue_state }) => queue_state === "done"),
    ).toHaveLength(2);
  });
});
