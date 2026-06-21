import { createRequestContext } from "@tests/support/auth/request-context";
import { describe, expect, it } from "vitest";

import {
  enforceCsrfRequestPolicy,
  enforceAuthRequest,
  isPublicPath,
} from "~/lib/auth/access/request-auth";

const LOCAL_ORIGIN = "http://localhost:3000";

describe("auth middleware csrf policy", () => {
  it("detects public routes", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/auth/google")).toBe(true);
    expect(isPublicPath("/_build/assets.js")).toBe(true);
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("allows same-origin unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBeNull();
  });

  it("rejects cross-site unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("rejects same-site unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "same-site" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("rejects requests with no fetch metadata context (none)", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { "sec-fetch-site": "none" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("accepts a request whose origin matches the target origin", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { Origin: LOCAL_ORIGIN },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBeNull();
  });

  it("falls back to strict origin matching when fetch metadata is absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { Origin: "http://evil.local" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBe("CSRF validation failed (Origin mismatch)");
  });

  it("derives the source origin from the referer when Origin is absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: { Referer: "http://evil.local/some/path" },
      }),
      LOCAL_ORIGIN,
    );
    expect(error).toBe("CSRF validation failed (Origin mismatch)");
  });

  it("fails closed when fetch metadata and origin headers are absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", { method: "POST" }),
      LOCAL_ORIGIN,
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
