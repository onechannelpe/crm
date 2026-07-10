import { afterEach, describe, expect, it, vi } from "vitest";

import { sendWithWhatsAppCloudText } from "../src/channels/whatsapp/meta-cloud";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendWithWhatsAppCloudText", () => {
  it("sends a digits-only recipient to Meta Cloud API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      sendWithWhatsAppCloudText({
        accessToken: "token",
        phoneNumberId: "123",
        apiVersion: "v23.0",
        to: "+1 (555) 123-4567",
        body: "Hello",
      }),
    ).resolves.toEqual({ providerMessageId: "wamid.1" });

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const parsedBody = JSON.parse(String(init?.body)) as {
      to: string;
      text: { body: string };
    };

    expect(parsedBody.to).toBe("15551234567");
    expect(parsedBody.text.body).toBe("Hello");
  });

  it("throws invalid_recipient when normalization removes all characters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      sendWithWhatsAppCloudText({
        accessToken: "token",
        phoneNumberId: "123",
        apiVersion: "v23.0",
        to: "+-() ",
        body: "Hello",
      }),
    ).rejects.toMatchObject({
      provider: "whatsapp_cloud",
      code: "invalid_recipient",
      retryable: false,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats HTTP 408 as retryable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("timeout", { status: 408 }),
    );

    await expect(
      sendWithWhatsAppCloudText({
        accessToken: "token",
        phoneNumberId: "123",
        apiVersion: "v23.0",
        to: "+1 (555) 123-4567",
        body: "Hello",
      }),
    ).rejects.toMatchObject({
      provider: "whatsapp_cloud",
      code: "http_error",
      statusCode: 408,
      retryable: true,
    });
  });
});
