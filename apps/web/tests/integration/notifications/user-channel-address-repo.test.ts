import type { TestDbContext } from "@tests/support/runtime/db";
import { cleanupTestDb, createIsolatedTestDb } from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("user channel address repo", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("user-channel-address");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("does not reset verification when claiming the same whatsapp address", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "+51911111111",
      is_verified: 1,
      verified_at: 1000,
      created_at: 1000,
      updated_at: 1000,
    });

    const result = await ctx.repos.userChannelAddresses.claimWhatsAppAddress({
      userId: 1,
      address: "+51911111111",
      now: 2000,
    });

    expect(result).toEqual({ kind: "claimed" });
    const row = await ctx.repos.userChannelAddresses.findByUserAndChannel(
      1,
      "whatsapp",
    );
    expect(row).toMatchObject({
      user_id: 1,
      channel: "whatsapp",
      address: "+51911111111",
      is_verified: 1,
      verified_at: 1000,
      updated_at: 1000,
    });
  });

  it("resets verification when claiming a different whatsapp address", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "+51911111111",
      is_verified: 1,
      verified_at: 1000,
      created_at: 1000,
      updated_at: 1000,
    });

    const result = await ctx.repos.userChannelAddresses.claimWhatsAppAddress({
      userId: 1,
      address: "+51922222222",
      now: 2000,
    });

    expect(result).toEqual({ kind: "claimed" });
    const row = await ctx.repos.userChannelAddresses.findByUserAndChannel(
      1,
      "whatsapp",
    );
    expect(row).toMatchObject({
      user_id: 1,
      channel: "whatsapp",
      address: "+51922222222",
      is_verified: 0,
      verified_at: null,
      updated_at: 2000,
    });
  });
});
