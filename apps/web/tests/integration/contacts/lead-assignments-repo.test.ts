import { createContactsTestKit } from "@tests/support/contacts/kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("lead assignment repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("lead-assignments");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("returns only active and non expired assignments", async () => {
    const now = Date.now();
    const contacts = createContactsTestKit(ctx);
    await contacts.seedAssignments([
      {
        userId: 1,
        contactId: 1,
        assignedAt: now,
        expiresAt: now + 60_000,
        status: "active",
      },
      {
        userId: 1,
        contactId: 2,
        assignedAt: now,
        expiresAt: now - 1,
        status: "active",
      },
      {
        userId: 1,
        contactId: 2,
        assignedAt: now,
        expiresAt: now + 60_000,
        status: "completed",
      },
    ]);

    const active = await ctx.repos.contactAssignments.findActiveByUser(1);
    expect(active).toHaveLength(1);
    expect(active[0].contact_id).toBe(1);
  });

  it("hasActiveForContact respects expiry and ownership", async () => {
    const now = Date.now();
    const contacts = createContactsTestKit(ctx);
    await contacts.seedAssignments([
      {
        userId: 1,
        contactId: 1,
        assignedAt: now,
        expiresAt: now + 60_000,
        status: "active",
      },
      {
        userId: 3,
        contactId: 2,
        assignedAt: now,
        expiresAt: now + 60_000,
        status: "active",
      },
    ]);

    expect(await ctx.repos.contactAssignments.hasActiveForContact(1, 1)).toBe(
      true,
    );
    expect(await ctx.repos.contactAssignments.hasActiveForContact(1, 2)).toBe(
      false,
    );
    expect(await ctx.repos.contactAssignments.hasActiveForContact(3, 2)).toBe(
      true,
    );
  });
});
