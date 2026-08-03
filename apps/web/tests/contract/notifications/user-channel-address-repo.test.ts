import { phone } from "@tests/support/_core/phone";
import type { TestDbContext } from "@tests/support/runtime/db";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const USER_ID = TEST_FIXTURES.users.execOne.id;
const INITIAL_AT = new Date(1_000);
const CLAIM_AT = new Date(2_000);

describe("user channel address repo", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("user-channel-address");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("does not reset verification when claiming the same whatsapp address", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: USER_ID,
      channel: "whatsapp",
      address: "911111111",
      is_verified: true,
      verified_at: INITIAL_AT,
      created_at: INITIAL_AT,
      updated_at: INITIAL_AT,
    });

    const result = await ctx.repos.userChannelAddresses.claimWhatsAppAddress({
      userId: USER_ID,
      address: phone("911111111"),
      claimedAt: CLAIM_AT,
    });

    expect(result).toEqual({ kind: "claimed" });
    const row = await ctx.repos.userChannelAddresses.findByUserAndChannel(
      USER_ID,
      "whatsapp",
    );
    expect(row).toMatchObject({
      user_id: USER_ID,
      channel: "whatsapp",
      address: "911111111",
      is_verified: true,
      verified_at: INITIAL_AT,
      updated_at: INITIAL_AT,
    });
  });

  it("resets verification when claiming a different whatsapp address", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: USER_ID,
      channel: "whatsapp",
      address: "911111111",
      is_verified: true,
      verified_at: INITIAL_AT,
      created_at: INITIAL_AT,
      updated_at: INITIAL_AT,
    });

    const result = await ctx.repos.userChannelAddresses.claimWhatsAppAddress({
      userId: USER_ID,
      address: phone("922222222"),
      claimedAt: CLAIM_AT,
    });

    expect(result).toEqual({ kind: "claimed" });
    const row = await ctx.repos.userChannelAddresses.findByUserAndChannel(
      USER_ID,
      "whatsapp",
    );
    expect(row).toMatchObject({
      user_id: USER_ID,
      channel: "whatsapp",
      address: "922222222",
      is_verified: false,
      verified_at: null,
      updated_at: CLAIM_AT,
    });
  });
});
