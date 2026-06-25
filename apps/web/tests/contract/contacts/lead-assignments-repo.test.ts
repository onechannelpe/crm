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

  it("returns only active and non-expired assignments", async () => {
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

    const activeContactIds = await contacts.activeContactIdsForUser(1);
    expect(activeContactIds).toEqual([1]);
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

    expect(await contacts.hasActiveAssignment(1, 1)).toBe(true);
    expect(await contacts.hasActiveAssignment(1, 2)).toBe(false);
    expect(await contacts.hasActiveAssignment(3, 2)).toBe(true);
  });
});
