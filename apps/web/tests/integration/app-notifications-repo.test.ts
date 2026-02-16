import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TestDbContext } from "../support/test-db";

import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

describe("app notifications repo", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("app-notifications");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("deduplicates notifications by user and dedupe key", async () => {
    const now = Date.now();
    await ctx.repos.appNotifications.createMany([
      {
        user_id: 1,
        event_type: "quota.assigned",
        priority: "normal",
        title: "Test",
        body_text: "Body",
        action_url: "/quota",
        dedupe_key: "quota:1:today",
        metadata_json: null,
        created_at: now,
        read_at: null,
      },
      {
        user_id: 1,
        event_type: "quota.assigned",
        priority: "normal",
        title: "Test Duplicate",
        body_text: "Body",
        action_url: "/quota",
        dedupe_key: "quota:1:today",
        metadata_json: null,
        created_at: now,
        read_at: null,
      },
    ]);

    const list = await ctx.repos.appNotifications.listByUser(1, 10);
    expect(list.length).toBe(1);
  });
});
