import type { TestDbContext } from "@tests/support/runtime/db";
import { cleanupTestDb, createIsolatedTestDb } from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asUserId } from "~/server/shared/ids";

describe("app notifications repo", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("app-notifications");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("deduplicates notifications by user and source event id", async () => {
    const now = new Date();
    const userId = asUserId("app-notifications-user");
    await ctx.repos.appNotifications.createMany([
      {
        user_id: userId,
        source_event_id: "quota:1:today",
        event_type: "quota.assigned",
        priority: "normal",
        title: "Test",
        body_text: "Body",
        action_url: "/quota",
        metadata_json: null,
        created_at: now,
        read_at: null,
      },
      {
        user_id: userId,
        source_event_id: "quota:1:today",
        event_type: "quota.assigned",
        priority: "normal",
        title: "Test Duplicate",
        body_text: "Body",
        action_url: "/quota",
        metadata_json: null,
        created_at: now,
        read_at: null,
      },
    ]);

    const list = await ctx.repos.appNotifications.listByUser(userId, 10);
    expect(list.length).toBe(1);
  });
});
