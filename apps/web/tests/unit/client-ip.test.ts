import { describe, expect, it } from "vitest";
import { getClientIp } from "../../src/lib/auth/password/client-ip";

describe("client ip resolution", () => {
  it("prefers cf-connecting-ip", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.2, 203.0.113.3",
      "x-real-ip": "203.0.113.4",
    });
    expect(getClientIp(headers)).toBe("198.51.100.10");
  });

  it("falls back to first x-forwarded-for value", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.2, 203.0.113.3",
    });
    expect(getClientIp(headers)).toBe("203.0.113.2");
  });

  it("falls back to x-real-ip and then localhost", () => {
    const real = new Headers({ "x-real-ip": "192.0.2.9" });
    expect(getClientIp(real)).toBe("192.0.2.9");
    expect(getClientIp(new Headers())).toBe("127.0.0.1");
  });
});
