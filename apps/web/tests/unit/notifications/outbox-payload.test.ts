import { describe, expect, it } from "vitest";

import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "~/server/notifications/outbox-payload";

describe("notification outbox payload", () => {
  it("parses valid audience variants", () => {
    expect(
      parseNotificationAudience(
        JSON.stringify({ kind: "branch_role", branchId: 2, role: "admin" }),
      ),
    ).toEqual({ kind: "branch_role", branchId: 2, role: "admin" });
  });

  it("rejects invalid audience data", () => {
    expect(() =>
      parseNotificationAudience(
        JSON.stringify({ kind: "user_ids", userIds: [1, "2"] }),
      ),
    ).toThrow("Invalid notification audience payload");
  });

  it("parses supported channels", () => {
    expect(
      parseNotificationChannels(JSON.stringify(["in_app", "whatsapp"])),
    ).toEqual(["in_app", "whatsapp"]);
  });

  it("rejects unsupported channels", () => {
    expect(() =>
      parseNotificationChannels(JSON.stringify(["in_app", "sms"])),
    ).toThrow("Invalid notification channels payload");
  });
});
