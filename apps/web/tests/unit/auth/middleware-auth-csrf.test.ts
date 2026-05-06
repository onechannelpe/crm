import { createRequestContext } from "@tests/support/auth/request-context";
import { afterEach, describe, expect, it } from "vitest";

import {
  enforceCsrfRequestPolicy,
  enforceAuthRequest,
  getTargetOrigin,
  isPublicPath,
} from "~/lib/auth/access/request-auth";

describe("auth middleware csrf policy", () => {
  afterEach(() => {
    process.env.TRUSTED_PROXY = "false";
  });

  it("detects public routes", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/auth/google")).toBe(true);
    expect(isPublicPath("/_build/assets.js")).toBe(true);
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("rejects cross-site unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      }),
    );
    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("rejects same-site unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "same-site" },
      }),
    );
    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("falls back to strict origin matching when fetch metadata is absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { Origin: "http://evil.local" },
      }),
    );
    expect(error).toBe("CSRF validation failed (Origin mismatch)");
  });

  it("fails closed when fetch metadata and origin headers are absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", { method: "POST" }),
    );
    expect(error).toBe("CSRF validation failed (Origin missing)");
  });

  it("rejects anonymous unsafe requests without a synchronizer token", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/login", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(null, null),
      },
    });
    expect(decision.kind).toBe("reject");
  });

  it("uses forwarded public origin behind a trusted proxy", () => {
    process.env.TRUSTED_PROXY = "true";

    const request = new Request("http://127.0.0.1:3000/dashboard", {
      method: "POST",
      headers: {
        Origin:
          "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
        "x-forwarded-proto": "https",
        "x-forwarded-host":
          "5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
      },
    });

    expect(getTargetOrigin(request)).toBe(
      "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
    );
    expect(enforceCsrfRequestPolicy(request)).toBeNull();
  });

  it("allows GET requests even when Origin does not match Host", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/login", {
        method: "GET",
        headers: {
          Origin: "http://evil.local",
          Host: "localhost:3000",
        },
      }),
      locals: { nonce: "nonce", requestContext: createRequestContext(null) },
    });

    expect(decision.kind).not.toBe("reject");
  });
});
