import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";
import { openSession } from "~/server/notifications/whatsapp-session";
import { asUserId } from "~/server/shared/ids";

const NOW = new Date(1_700_000_000_000);
const USER_ONE = asUserId("recipient-repo-user-one");
const USER_TWO = asUserId("recipient-repo-user-two");

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
      await repository.resolveAudience({
        kind: "user_ids",
        userIds: [USER_ONE],
      }),
    ).toEqual([USER_ONE]);
  });

  it("returns only verified addresses for a channel", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: USER_ONE,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await ctx.repos.userChannelAddresses.upsert({
      user_id: USER_TWO,
      channel: "whatsapp",
      address: "51911000002",
      is_verified: false,
      verified_at: null,
      created_at: NOW,
      updated_at: NOW,
    });

    const repository = createRecipientRepository(ctx.db);
    expect(
      await repository.findVerifiedAddresses([USER_ONE, USER_TWO], "whatsapp"),
    ).toEqual(new Map([[USER_ONE, "51911000001"]]));
  });

  it("returns only users with an active WhatsApp session", async () => {
    await openSession(ctx.db, USER_ONE, NOW);

    const repository = createRecipientRepository(ctx.db);
    expect(
      await repository.findActiveWhatsAppUsers([USER_ONE, USER_TWO], NOW),
    ).toEqual(new Set([USER_ONE]));
  });
});
