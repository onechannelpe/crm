import { createLeadFixtureWriter } from "@tests/support/database/workflow-fixtures";
import { createTestNotificationRuntime } from "@tests/support/integration/notification-runtime";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("outbox delivery", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("outbox-delivery");
    runtime.now.set(2_000);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("marks rows with malformed channels as failed", async () => {
    await runtime.ctx.db
      .insertInto("notification_outbox")
      .values({
        id: "test-malformed-channels",
        event_type: "test.malformed",
        audience_json: JSON.stringify({ kind: "user_ids", userIds: [1] }),
        channels_json: JSON.stringify(["in_app", "sms"]),
        title: "should fail",
        body_text: "unsupported channel",
        action_url: null,
        priority: "normal",
        status: "pending",
        attempt_count: 0,
        available_at: 0,
        lease_owner: null,
        lease_until: null,
        error: null,
        created_at: 0,
        processed_at: null,
      })
      .execute();

    await createTestNotificationRuntime(runtime).processor.runUntilIdle({
      workerId: "malformed",
    });

    const failed = await runtime.ctx.db
      .selectFrom("notification_outbox")
      .select(["status", "error"])
      .where("id", "=", "test-malformed-channels")
      .executeTakeFirstOrThrow();

    expect(failed.status).toBe("failed");
    expect(failed.error).toContain("Invalid notification channels payload");
  });

  it("drains pending outbox events and persists notifications", async () => {
    const givenLead = createLeadFixtureWriter(runtime);
    const importer = createWorkflowImporter({
      runtime,
      nextJobKey: (key) => key ?? "delivery",
    }).importer;
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
    await notificationsRuntime.processor.runUntilIdle({ workerId: "delivery" });

    const reader = createNotificationReader(runtime);
    const notifications = await reader.appNotifications();
    expect(notifications).toEqual([
      {
        user_id: 2,
        event_type: "lead.ready_for_quotation",
        source_event_id: expect.stringContaining(":ready_pricing"),
      },
      {
        user_id: 4,
        event_type: "lead.ready_for_quotation",
        source_event_id: expect.stringContaining(":ready_pricing"),
      },
    ]);

    const outbox = await reader.outbox();
    expect(outbox.filter(({ status }) => status === "done")).toHaveLength(2);
  });
});
