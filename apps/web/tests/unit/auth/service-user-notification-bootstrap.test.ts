// oxlint-disable vitest/require-mock-type-parameters
import { phone } from "@tests/support/_core/phone";
import { describe, expect, it, vi } from "vitest";

import { UserId } from "~/server/shared/ids";
import { bootstrapUserNotifications } from "~/server/users/service-user-notification-bootstrap";

const NOW_MS = 1_710_000_000_000;
const NOW = new Date(NOW_MS);
const INPUT = {
  userId: UserId.trust("5"),
  email: "test@example.com",
  phone: phone(),
  now: NOW,
} as const;

describe("bootstrapUserNotifications", () => {
  it("returns success and writes the channel addresses when the claim succeeds", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi.fn().mockResolvedValue({ kind: "claimed" });

    const result = await bootstrapUserNotifications(INPUT, {
      userChannelAddresses: {
        upsert: upsertAddress,
        claimWhatsAppAddress,
      },
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(upsertAddress).toHaveBeenCalledWith({
      user_id: INPUT.userId,
      channel: "email",
      address: INPUT.email,
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    expect(claimWhatsAppAddress).toHaveBeenCalledTimes(1);
    expect(claimWhatsAppAddress).toHaveBeenCalledWith({
      userId: INPUT.userId,
      address: INPUT.phone,
      now: NOW,
    });
  });

  it("returns address_already_claimed when the whatsapp claim is denied", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi.fn().mockResolvedValue({
      kind: "already_claimed",
      ownerUserId: UserId.trust("99"),
    });

    const result = await bootstrapUserNotifications(INPUT, {
      userChannelAddresses: {
        upsert: upsertAddress,
        claimWhatsAppAddress,
      },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "address_already_claimed",
        ownerUserId: UserId.trust("99"),
      },
    });
    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(claimWhatsAppAddress).toHaveBeenCalledTimes(1);
  });

  it("propagates an unexpected claim failure", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi
      .fn()
      .mockRejectedValue(new Error("db unavailable"));

    await expect(
      bootstrapUserNotifications(INPUT, {
        userChannelAddresses: {
          upsert: upsertAddress,
          claimWhatsAppAddress,
        },
      }),
    ).rejects.toThrow("db unavailable");

    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(claimWhatsAppAddress).toHaveBeenCalledTimes(1);
  });
});
