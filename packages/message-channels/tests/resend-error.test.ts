import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseResendError,
  sendWithResend,
} from "../src/channels/email/resend-client";

const TEST_INPUT = {
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Test",
  html: "<p>Test</p>",
  text: "Test",
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseResendError", () => {
  it("returns the message field when the provider body includes it", () => {
    expect(
      parseResendError({
        name: "validation_error",
        statusCode: 422,
        message: 'The "from" field is invalid',
      }),
    ).toEqual({
      code: "validation_error",
      message: 'The "from" field is invalid',
    });
  });

  it("accepts a message-only error payload", () => {
    expect(parseResendError({ message: "rate limit exceeded" })).toEqual({
      code: "resend_error",
      message: "rate limit exceeded",
    });
  });

  it("returns null for bodies without a string message", () => {
    expect(parseResendError({ name: "error", statusCode: 500 })).toBeNull();
    expect(parseResendError({ message: 123 })).toBeNull();
    expect(parseResendError({ message: null })).toBeNull();
    expect(parseResendError({ message: { nested: true } })).toBeNull();
  });
});

describe("sendWithResend", () => {
  it("posts the expected payload to the Resend API", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));

    await expect(sendWithResend("test-key", TEST_INPUT)).resolves.toEqual({
      providerMessageId: null,
    });

    expect(fetchSpy).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_INPUT),
    });
  });

  it("throws the provider message when the error response includes one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "validation_error",
          statusCode: 422,
          message: 'Invalid "from" field',
        }),
        { status: 422 },
      ),
    );

    await expect(sendWithResend("test-key", TEST_INPUT)).rejects.toMatchObject({
      provider: "resend",
      code: "validation_error",
      statusCode: 422,
      message: 'Resend send failed: Invalid "from" field',
      retryable: false,
    });
  });

  it("falls back to the HTTP status when the error body is not JSON", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body>500 Internal Server Error</body></html>", {
        status: 500,
      }),
    );

    await expect(sendWithResend("test-key", TEST_INPUT)).rejects.toMatchObject({
      provider: "resend",
      code: "http_error",
      statusCode: 500,
      message: "Resend send failed: HTTP 500",
      retryable: true,
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to parse Resend error response",
      expect.objectContaining({ status: 500 }),
    );
  });

  it("falls back to the HTTP status when the JSON body has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "some_error" }), { status: 400 }),
    );

    await expect(sendWithResend("test-key", TEST_INPUT)).rejects.toMatchObject({
      provider: "resend",
      code: "http_error",
      statusCode: 400,
      message: "Resend send failed: HTTP 400",
      retryable: false,
    });
  });
});
