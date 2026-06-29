import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";
import { openSession } from "~/server/notifications/whatsapp-session";

const NOW = 1_700_000_000_000;

describe("recipient repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("recipient-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("resolves an explicit user-id audience", async () => {
    const repository = createRecipientRepository(ctx.db);
    expect(
      await repository.resolveAudience({ kind: "user_ids", userIds: [1] }),
    ).toEqual([1]);
  });

  it("returns only verified addresses for a channel", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 2,
      channel: "whatsapp",
      address: "51911000002",
      is_verified: 0,
      verified_at: null,
      created_at: NOW,
      updated_at: NOW,
    });

    const repository = createRecipientRepository(ctx.db);
    expect(await repository.findVerifiedAddresses([1, 2], "whatsapp")).toEqual(
      new Map([[1, "51911000001"]]),
    );
  });

  it("returns only users with an active WhatsApp session", async () => {
    await openSession(ctx.db, 1, NOW);

    const repository = createRecipientRepository(ctx.db);
    expect(await repository.findActiveWhatsAppUsers([1, 2], NOW)).toEqual(
      new Set([1]),
    );
  });
});
