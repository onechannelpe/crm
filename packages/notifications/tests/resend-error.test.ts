import { describe, expect, it } from "vitest";

import { parseResendError } from "../src/channels/email/resend-client";

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

  it("returns undefined for non-object body", () => {
    expect(parseResendError(null)).toBeUndefined();
    expect(parseResendError(undefined)).toBeUndefined();
    expect(parseResendError("string error")).toBeUndefined();
    expect(parseResendError(42)).toBeUndefined();
    expect(parseResendError(true)).toBeUndefined();
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

  it("handles an empty object", () => {
    expect(parseResendError({})).toBeUndefined();
  });

  it("handles array bodies (unexpected but possible)", () => {
    // Arrays are objects in JS — should not crash
    expect(parseResendError([1, 2, 3])).toBeUndefined();
  });
});
