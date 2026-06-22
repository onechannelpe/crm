import { afterEach, describe, expect, it, vi } from "vitest";

import { sendWithKapsoWhatsAppText } from "../src/channels/whatsapp/kapso-proxy";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendWithKapsoWhatsAppText", () => {
  it("sends a text message through the Kapso Meta proxy", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.kapso.1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      sendWithKapsoWhatsAppText({
        apiKey: "kapso-key",
        phoneNumberId: "123",
        metaGraphVersion: "v24.0",
        to: "+1 (555) 123-4567",
        body: "Hello",
      }),
    ).resolves.toEqual({ providerMessageId: "wamid.kapso.1" });

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    const parsedBody = JSON.parse(String(init?.body)) as {
      to: string;
      text: { body: string };
    };

    expect(url).toBe("https://api.kapso.ai/meta/whatsapp/v24.0/123/messages");
    expect(headers.get("X-API-Key")).toBe("kapso-key");
    expect(parsedBody.to).toBe("15551234567");
    expect(parsedBody.text.body).toBe("Hello");
  });

  it("throws invalid_recipient before calling Kapso", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      sendWithKapsoWhatsAppText({
        apiKey: "kapso-key",
        phoneNumberId: "123",
        metaGraphVersion: "v24.0",
        to: "+-() ",
        body: "Hello",
      }),
    ).rejects.toMatchObject({
      provider: "kapso",
      code: "invalid_recipient",
      retryable: false,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
