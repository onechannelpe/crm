import { describe, expect, it } from "vitest";

import { resolvePublicOrigin } from "~/lib/http/public-origin";

const FORWARDED_ORIGIN =
  "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev";

describe("resolvePublicOrigin", () => {
  it("uses x-forwarded headers when the proxy is trusted", () => {
    const request = new Request("http://127.0.0.1:3000/home", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host":
          "5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
      },
    });

    expect(resolvePublicOrigin(request, { trustedProxy: true })).toBe(
      FORWARDED_ORIGIN,
    );
  });

  it("parses the standard Forwarded header when the proxy is trusted", () => {
    const request = new Request("http://127.0.0.1:3000/home", {
      headers: { forwarded: 'proto=https;host="example.dev"' },
    });

    expect(resolvePublicOrigin(request, { trustedProxy: true })).toBe(
      "https://example.dev",
    );
  });

  it("takes the first hop from comma-separated x-forwarded values", () => {
    const request = new Request("http://127.0.0.1:3000/home", {
      headers: {
        "x-forwarded-proto": "https,http",
        "x-forwarded-host": "public.dev,internal.local",
      },
    });

    expect(resolvePublicOrigin(request, { trustedProxy: true })).toBe(
      "https://public.dev",
    );
  });

  it("falls back to the request origin when Forwarded lacks a host", () => {
    const request = new Request("http://127.0.0.1:3000/home", {
      headers: { forwarded: "proto=https" },
    });

    expect(resolvePublicOrigin(request, { trustedProxy: true })).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("ignores forwarded headers when the proxy is untrusted", () => {
    const request = new Request("http://127.0.0.1:3000/home", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.dev",
      },
    });

    expect(resolvePublicOrigin(request, { trustedProxy: false })).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("falls back to the request origin when forwarded headers are absent", () => {
    const request = new Request("http://127.0.0.1:3000/home");

    expect(resolvePublicOrigin(request, { trustedProxy: true })).toBe(
      "http://127.0.0.1:3000",
    );
  });
});
