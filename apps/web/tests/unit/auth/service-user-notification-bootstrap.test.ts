import { describe, expect, it, vi } from "vitest";

import { isErr } from "~/server/shared/result";
import { bootstrapUserNotifications } from "~/server/users/service-user-notification-bootstrap";

type NotificationBootstrapRepos = Parameters<
  typeof bootstrapUserNotifications
>[1];

function createRepos(overrides?: Partial<NotificationBootstrapRepos>) {
  const userChannelAddresses: NotificationBootstrapRepos["userChannelAddresses"] =
    {
      listByUser: vi.fn(),
      findByUserAndChannel: vi.fn(),
      findByChannelAndAddress: vi.fn(),
      upsert: vi.fn(),
      claimWhatsAppAddress: vi.fn(),
    };
  const notificationPreferences: NotificationBootstrapRepos["notificationPreferences"] =
    {
      upsert: vi.fn(),
    };

  return {
    userChannelAddresses,
    notificationPreferences,
    ...overrides,
  };
}

describe("bootstrapUserNotifications", () => {
  it("maps whatsapp unique collisions to address_already_claimed", async () => {
    const repos = createRepos();

    repos.userChannelAddresses.upsert = vi.fn().mockResolvedValue(undefined);
    repos.userChannelAddresses.claimWhatsAppAddress = vi
      .fn()
      .mockResolvedValue({
        kind: "already_claimed",
        ownerUserId: 99,
      });

    const result = await bootstrapUserNotifications(
      {
        userId: 5,
        email: "test@example.com",
        phoneE164: "+51999888777",
        now: 1_710_000_000_000,
      },
      repos,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) throw new Error("Expected conflict result");
    expect(result.error).toEqual({
      code: "address_already_claimed",
      ownerUserId: 99,
    });
  });
});
