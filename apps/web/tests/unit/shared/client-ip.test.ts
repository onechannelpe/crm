import { describe, expect, it } from "vitest";

import { getClientIp } from "~/lib/auth/password/client-ip";

describe("client ip resolution", () => {
  describe("with trusted proxy enabled", () => {
    it("prefers cf-connecting-ip", () => {
      const headers = new Headers({
        "cf-connecting-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.2, 203.0.113.3",
        "x-real-ip": "203.0.113.4",
      });
      expect(getClientIp(headers, true)).toBe("198.51.100.10");
    });

    it("falls back to first x-forwarded-for value", () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.2, 203.0.113.3",
      });
      expect(getClientIp(headers, true)).toBe("203.0.113.2");
    });

    it("falls back to x-real-ip and then localhost", () => {
      const real = new Headers({ "x-real-ip": "192.0.2.9" });
      expect(getClientIp(real, true)).toBe("192.0.2.9");
      expect(getClientIp(new Headers(), true)).toBe("127.0.0.1");
    });
  });

  describe("without trusted proxy (default for direct connections)", () => {
    it("returns 127.0.0.1 regardless of forwarded headers to prevent spoofing", () => {
      const spoofed = new Headers({
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "5.6.7.8",
        "x-real-ip": "9.10.11.12",
      });
      expect(getClientIp(spoofed, false)).toBe("127.0.0.1");
    });

    it("returns 127.0.0.1 even with no headers", () => {
      expect(getClientIp(new Headers(), false)).toBe("127.0.0.1");
    });
  });
});
