// oxlint-disable vitest/require-mock-type-parameters
import { describe, expect, it, vi } from "vitest";

import { parsePhone } from "~/lib/phone/pe-mobile";
import { bootstrapUserNotifications } from "~/server/users/service-user-notification-bootstrap";

const NOW = 1_710_000_000_000;
const INPUT = {
  userId: 5,
  email: "test@example.com",
  phone: parsePhone("999888777")!,
  now: NOW,
} as const;

describe("bootstrapUserNotifications", () => {
  it("returns success and writes channel + preferences when claim succeeds", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi.fn().mockResolvedValue({ kind: "claimed" });
    const upsertPreference = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapUserNotifications(INPUT, {
      userChannelAddresses: {
        listByUser: vi.fn(),
        findByUserAndChannel: vi.fn(),
        findByChannelAndAddress: vi.fn(),
        upsert: upsertAddress,
        claimWhatsAppAddress,
      },
      notificationPreferences: {
        upsert: upsertPreference,
      },
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(upsertAddress).toHaveBeenCalledWith({
      user_id: INPUT.userId,
      channel: "email",
      address: INPUT.email,
      is_verified: 1,
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
    expect(upsertPreference).toHaveBeenCalledTimes(4);
    expect(upsertPreference.mock.calls.map(([arg]) => arg.channel)).toEqual([
      "email",
      "whatsapp",
      "email",
      "whatsapp",
    ]);
    expect(upsertPreference.mock.calls.map(([arg]) => arg.event_type)).toEqual([
      "security.privileged_login",
      "security.privileged_login",
      "broadcast.general",
      "broadcast.general",
    ]);
  });

  it("returns address_already_claimed and does not write preferences when claim is denied", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi.fn().mockResolvedValue({
      kind: "already_claimed",
      ownerUserId: 99,
    });
    const upsertPreference = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapUserNotifications(INPUT, {
      userChannelAddresses: {
        listByUser: vi.fn(),
        findByUserAndChannel: vi.fn(),
        findByChannelAndAddress: vi.fn(),
        upsert: upsertAddress,
        claimWhatsAppAddress,
      },
      notificationPreferences: {
        upsert: upsertPreference,
      },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "address_already_claimed",
        ownerUserId: 99,
      },
    });
    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(claimWhatsAppAddress).toHaveBeenCalledTimes(1);
    expect(upsertPreference).not.toHaveBeenCalled();
  });

  it("propagates unexpected claim failure and stops before preferences", async () => {
    const upsertAddress = vi.fn().mockResolvedValue(undefined);
    const claimWhatsAppAddress = vi
      .fn()
      .mockRejectedValue(new Error("db unavailable"));
    const upsertPreference = vi.fn().mockResolvedValue(undefined);

    await expect(
      bootstrapUserNotifications(INPUT, {
        userChannelAddresses: {
          listByUser: vi.fn(),
          findByUserAndChannel: vi.fn(),
          findByChannelAndAddress: vi.fn(),
          upsert: upsertAddress,
          claimWhatsAppAddress,
        },
        notificationPreferences: {
          upsert: upsertPreference,
        },
      }),
    ).rejects.toThrow("db unavailable");

    expect(upsertAddress).toHaveBeenCalledTimes(1);
    expect(claimWhatsAppAddress).toHaveBeenCalledTimes(1);
    expect(upsertPreference).not.toHaveBeenCalled();
  });
});
