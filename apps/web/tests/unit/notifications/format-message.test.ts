import { describe, expect, it } from "vitest";

import { formatWhatsAppNotificationBody } from "~/server/notifications/dispatch/format-message";

describe("formatWhatsAppNotificationBody", () => {
  it("appends an absolute action URL to WhatsApp messages", () => {
    expect(
      formatWhatsAppNotificationBody(
        {
          body_text:
            "El cliente RUC 20123456789 aceptó la tarifa. Define la política digital para continuar.",
          action_url: "/records/lead-id",
        },
        "https://app.example.com",
      ),
    ).toBe(
      "El cliente RUC 20123456789 aceptó la tarifa. Define la política digital para continuar. Revísalo en: https://app.example.com/records/lead-id",
    );
  });

  it("leaves WhatsApp messages without action URLs unchanged", () => {
    expect(
      formatWhatsAppNotificationBody(
        {
          body_text: "Privileged login detected.",
          action_url: null,
        },
        "https://app.example.com",
      ),
    ).toBe("Privileged login detected.");
  });
});
