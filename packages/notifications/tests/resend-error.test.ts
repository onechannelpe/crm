import { describe, expect, it, vi } from "vitest";

import {
  parseResendError,
  sendWithResend,
} from "../src/channels/email/resend-client";

describe("parseResendError", () => {
  it("extracts message from a valid Resend error body", () => {
    // Real Resend API shape per docs: { name, statusCode, message }
    const body = {
      name: "validation_error",
      statusCode: 422,
      message:
        'The "from" field is invalid. Please verify a domain at resend.com/domains.',
    };
    expect(parseResendError(body)).toBe(body.message);
  });

  it("extracts message even without name and statusCode fields", () => {
    expect(parseResendError({ message: "rate limit exceeded" })).toBe(
      "rate limit exceeded",
    );
  });

  it("returns undefined when message field is missing", () => {
    expect(
      parseResendError({ name: "error", statusCode: 500 }),
    ).toBeUndefined();
  });

  it("returns undefined when message is not a string", () => {
    expect(parseResendError({ message: 123 })).toBeUndefined();
    expect(parseResendError({ message: null })).toBeUndefined();
    expect(parseResendError({ message: { nested: true } })).toBeUndefined();
  });
});

describe("sendWithResend integration", () => {
  it("throws with extracted Resend error message on 422", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "validation_error",
          statusCode: 422,
          message: 'Invalid "from" field',
        }),
        { status: 422 },
      ),
    );
    global.fetch = mockFetch;

    await expect(
      sendWithResend("test-key", {
        from: "invalid",
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      }),
    ).rejects.toThrow('Resend send failed: Invalid "from" field');
  });

  it("falls back to HTTP status when response is not JSON (CDN error)", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("<html><body>500 Internal Server Error</body></html>", {
        status: 500,
      }),
    );
    global.fetch = mockFetch;

    await expect(
      sendWithResend("test-key", {
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      }),
    ).rejects.toThrow("Resend send failed: HTTP 500");

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to parse Resend error response",
      expect.objectContaining({ status: 500 }),
    );
    consoleError.mockRestore();
  });

  it("falls back to HTTP status when response JSON lacks message field", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "some_error" }), { status: 400 }),
      );
    global.fetch = mockFetch;

    await expect(
      sendWithResend("test-key", {
        from: "noreply@example.com",
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      }),
    ).rejects.toThrow("Resend send failed: HTTP 400");
  });
});
