import { afterEach, describe, expect, it } from "vitest";

import {
  enforceCsrfRequestPolicy,
  enforceAuthRequest,
  getTargetOrigin,
  isPublicPath,
  type AuthRequestDeps,
} from "../../src/lib/auth/access/request-auth";
import type { AuthSession } from "../../src/lib/auth/access/session-types";
import { asBranchId, asUserId } from "../../src/server/shared/ids";

function createSession(
  role: AuthSession["role"],
  onboardingCompleted = true,
): AuthSession {
  return {
    id: "session-id",
    userId: asUserId(1),
    branchId: asBranchId(1),
    role,
    onboardingCompleted,
    sessionClass: onboardingCompleted ? "app" : "pre_auth",
    primaryAuthMethod: "password",
    strongAuthMethod: null,
    strongAuthAt: null,
  };
}

function createDeps(params: {
  token: string | null | undefined;
  session: AuthSession | null;
}): AuthRequestDeps {
  return {
    getSessionCookie: () => params.token,
    validateSessionToken: async () => ({ session: params.session }),
  };
}

describe("auth middleware request guard", () => {
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
        headers: {
          "sec-fetch-site": "cross-site",
        },
      }),
    );

    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("rejects same-site unsafe requests via fetch metadata", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: {
          "sec-fetch-site": "same-site",
        },
      }),
    );

    expect(error).toBe("CSRF validation failed (Fetch Metadata)");
  });

  it("falls back to strict origin matching when fetch metadata is absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
        headers: {
          Origin: "http://evil.local",
        },
      }),
    );

    expect(error).toBe("CSRF validation failed (Origin mismatch)");
  });

  it("fails closed when fetch metadata and origin headers are absent", () => {
    const error = enforceCsrfRequestPolicy(
      new Request("http://localhost:3000/dashboard", {
        method: "POST",
      }),
    );

    expect(error).toBe("CSRF validation failed (Origin missing)");
  });

  it("uses the forwarded public origin behind a trusted proxy", () => {
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

  it("redirects to /login when private route has no session token", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/dashboard"),
      },
      createDeps({ token: null, session: null }),
    );

    expect(decision.kind).toBe("redirect_login");
  });

  it("redirects to /login when token is invalid", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/dashboard"),
      },
      createDeps({ token: "token", session: null }),
    );

    expect(decision.kind).toBe("redirect_login");
  });

  it("attaches session to locals when token is valid", async () => {
    const event: { request: Request; locals: App.RequestEventLocals } = {
      request: new Request("http://localhost:3000/leads"),
      locals: {},
    };

    const decision = await enforceAuthRequest(
      event,
      createDeps({ token: "token", session: createSession("executive") }),
    );

    expect(decision.kind).toBe("allow");
    expect(event.locals.session).toEqual(createSession("executive"));
  });

  it("redirects to /onboarding when session is not onboarded", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/dashboard"),
      },
      createDeps({
        token: "token",
        session: createSession("executive", false),
      }),
    );

    expect(decision.kind).toBe("redirect_onboarding");
  });

  it("redirects onboarded users away from /onboarding", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/onboarding"),
      },
      createDeps({ token: "token", session: createSession("executive") }),
    );

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind === "redirect_home") {
      expect(decision.to).toBe("/leads");
    }
  });

  it("redirects users from routes they cannot access", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/audit"),
      },
      createDeps({ token: "token", session: createSession("executive") }),
    );

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind === "redirect_home") {
      expect(decision.to).toBe("/leads");
    }
  });

  it("redirects authenticated users from root to their home route", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/"),
      },
      createDeps({ token: "token", session: createSession("logistics") }),
    );

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind === "redirect_home") {
      expect(decision.to).toBe("/inventory");
    }
  });

  it("allows users to access permitted routes", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/settings/profile"),
      },
      createDeps({ token: "token", session: createSession("admin") }),
    );

    expect(decision.kind).toBe("allow");
  });

  it("allows a not-onboarded user to reach /onboarding", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/onboarding"),
      },
      createDeps({
        token: "token",
        session: createSession("executive", false),
      }),
    );

    // Without the `pathname !== "/onboarding"` exception they'd loop forever
    expect(decision.kind).toBe("allow");
  });

  it("allows GET requests even when Origin does not match Host", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/login", {
          method: "GET",
          headers: {
            Origin: "http://evil.local",
            Host: "localhost:3000",
          },
        }),
      },
      createDeps({ token: null, session: null }),
    );

    // CSRF origin check must only fire on mutating methods, not GET
    expect(decision.kind).not.toBe("reject");
  });

  it("classifies all explicit public path prefixes correctly", () => {
    expect(isPublicPath("/releases/v1.0")).toBe(true);
    expect(isPublicPath("/docs/api")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
  });
});
