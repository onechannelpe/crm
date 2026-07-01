import { createContactAssignmentsTestKit } from "@tests/support/contact-assignments/kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("lead assignment repository", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("lead-assignments");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("returns only active and non-expired assignments", async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    const expiredAt = new Date(now.getTime() - 1);
    const { execOne } = ctx.fixtures.users;
    const { lima, norte } = ctx.fixtures.organizationPeople;
    const contacts = createContactAssignmentsTestKit(ctx);
    await contacts.seedAssignments([
      {
        userId: execOne.id,
        contactId: lima.id,
        assignedAt: now,
        expiresAt,
        status: "active",
      },
      {
        userId: execOne.id,
        contactId: norte.id,
        assignedAt: now,
        expiresAt: expiredAt,
        status: "active",
      },
      {
        userId: execOne.id,
        contactId: norte.id,
        assignedAt: now,
        expiresAt,
        status: "completed",
      },
    ]);

    const activeContactIds = await contacts.activeContactIdsForUser(execOne.id);
    expect(activeContactIds).toEqual([lima.id]);
  });

  it("hasActiveForContact respects expiry and ownership", async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    const { execOne, execTwo } = ctx.fixtures.users;
    const { lima, norte } = ctx.fixtures.organizationPeople;
    const contacts = createContactAssignmentsTestKit(ctx);
    await contacts.seedAssignments([
      {
        userId: execOne.id,
        contactId: lima.id,
        assignedAt: now,
        expiresAt,
        status: "active",
      },
      {
        userId: execTwo.id,
        contactId: norte.id,
        assignedAt: now,
        expiresAt,
        status: "active",
      },
    ]);

    expect(await contacts.hasActiveAssignment(execOne.id, lima.id)).toBe(true);
    expect(await contacts.hasActiveAssignment(execOne.id, norte.id)).toBe(
      false,
    );
    expect(await contacts.hasActiveAssignment(execTwo.id, norte.id)).toBe(true);
  });
});
