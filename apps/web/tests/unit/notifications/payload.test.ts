import { describe, expect, it } from "vitest";

import {
  parseNotificationAudience,
  parseNotificationChannels,
  validateNotificationIntent,
} from "~/server/notifications/intent/payload";

describe("notification outbox payload", () => {
  it("parses valid audience variants", () => {
    expect(
      parseNotificationAudience({
        kind: "branch_role",
        branchId: "2",
        role: "admin",
      }),
    ).toEqual({ kind: "branch_role", branchId: "2", role: "admin" });
  });

  it("rejects invalid audience data", () => {
    expect(() =>
      parseNotificationAudience({ kind: "user_ids", userIds: [1, "2"] }),
    ).toThrow("Invalid notification audience payload");
  });

  it("parses supported channels", () => {
    expect(parseNotificationChannels(["in_app", "whatsapp"])).toEqual([
      "in_app",
      "whatsapp",
    ]);
  });

  it("rejects unsupported channels", () => {
    expect(() => parseNotificationChannels(["in_app", "sms"])).toThrow(
      "Invalid notification channels payload",
    );
  });
});

describe("validateNotificationIntent", () => {
  const validIntent = {
    id: "test-1",
    eventType: "test.event",
    audience: { kind: "user_ids", userIds: ["1"] },
    channels: ["in_app"],
    priority: "normal",
    title: "hello",
    bodyText: "world",
    actionUrl: null,
  };

  it("accepts a well-formed intent", () => {
    expect(validateNotificationIntent(validIntent)).toEqual(validIntent);
  });

  it("rejects a non-string user id at the producer boundary", () => {
    expect(() =>
      validateNotificationIntent({
        ...validIntent,
        audience: { kind: "user_ids", userIds: ["1", 0] },
      }),
    ).toThrow("Invalid notification intent");
  });

  it("rejects an unsupported channel at the producer boundary", () => {
    expect(() =>
      validateNotificationIntent({
        ...validIntent,
        channels: ["in_app", "sms"],
      }),
    ).toThrow("Invalid notification intent");
  });

  it("rejects an unknown role at the producer boundary", () => {
    expect(() =>
      validateNotificationIntent({
        ...validIntent,
        audience: { kind: "branch_role", branchId: "1", role: "intruder" },
      }),
    ).toThrow("Invalid notification intent");
  });
});
