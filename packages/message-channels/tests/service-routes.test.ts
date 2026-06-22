import { describe, expect, it } from "vitest";

import { createMessageChannels } from "../src/service";
import type { DeliveryProvider, NotificationRoutes } from "../src/types";

const emailProvider: DeliveryProvider<"email"> = {
  id: "resend",
  channel: "email",
  async send() {
    return { providerMessageId: "email-1" };
  },
};

const whatsappProvider: DeliveryProvider<"whatsapp"> = {
  id: "kapso",
  channel: "whatsapp",
  async send() {
    return { providerMessageId: "whatsapp-1" };
  },
};

describe("createMessageChannels", () => {
  it("dispatches a routed channel to its provider", async () => {
    const channels = createMessageChannels({
      routes: { whatsapp: "kapso" },
      providers: [whatsappProvider],
    });

    await expect(
      channels.sendWhatsAppText({ to: "999888777", body: "Hello" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        channel: "whatsapp",
        provider: "kapso",
        providerMessageId: "whatsapp-1",
      },
    });
  });

  it("returns not_configured for channels omitted from the route map", async () => {
    const channels = createMessageChannels({
      routes: { whatsapp: "kapso" },
      providers: [whatsappProvider],
    });

    await expect(
      channels.sendEmail({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hello</p>",
        text: "Hello",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        kind: "not_configured",
        channel: "email",
      },
    });
  });

  it("rejects duplicate provider ids", () => {
    expect(() =>
      createMessageChannels({
        routes: { email: "resend" },
        providers: [emailProvider, emailProvider],
      }),
    ).toThrow("Duplicate notification provider: resend");
  });

  it("rejects a route to a provider registered for another channel", () => {
    const routes = {
      whatsapp: "resend",
    } as unknown as NotificationRoutes;

    expect(() =>
      createMessageChannels({
        routes,
        providers: [emailProvider],
      }),
    ).toThrow("Notification route whatsapp:resend cannot use a email provider");
  });

  it("rejects a route to an unregistered provider", () => {
    expect(() =>
      createMessageChannels({
        routes: { email: "resend" },
        providers: [],
      }),
    ).toThrow(
      "Notification route email:resend references an unregistered provider",
    );
  });
});
