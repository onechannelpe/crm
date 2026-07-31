import { describe, expect, it } from "vitest";

import { normalizePhoneInput, parsePhone } from "~/domain/phone/pe-mobile";

describe("pe-mobile phone helpers", () => {
  it("normalizes a +51 prefixed mobile to local format", () => {
    expect(normalizePhoneInput("+51 987 654 321")).toBe("987654321");
  });

  it("does not silently truncate extra digits", () => {
    expect(normalizePhoneInput("9876543210")).toBe("9876543210");
    expect(parsePhone("9876543210")).toBeNull();
  });

  it("accepts a valid local mobile", () => {
    expect(parsePhone("987654321")).toBe("987654321");
  });
});
