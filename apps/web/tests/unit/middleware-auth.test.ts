import { describe, expect, it } from "vitest";

import {
  enforceAuthRequest,
  isPublicPath,
  type AuthRequestDeps,
} from "../../src/lib/auth/access/request-auth";
import type { AuthSession } from "../../src/lib/auth/access/session-types";

function createSession(
  role: AuthSession["role"],
  onboardingCompleted = true,
): AuthSession {
  return {
    id: "session-id",
    userId: 1,
    branchId: 1,
    role,
    onboardingCompleted,
    authMethod: "password",
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
  it("detects public routes", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/_build/assets.js")).toBe(true);
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("returns 403 on csrf origin mismatch for non-get requests", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/dashboard", {
          method: "POST",
          headers: {
            Origin: "http://evil.local",
            Host: "localhost:3000",
          },
        }),
      },
      createDeps({ token: null, session: null }),
    );

    expect(decision.kind).toBe("reject");
    const status = decision.kind === "reject" ? decision.response.status : null;
    expect(status).toBe(403);
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
      expect(decision.to).toBe("/sales/leads");
    }
  });

  it("redirects users from routes they cannot access", async () => {
    const decision = await enforceAuthRequest(
      {
        request: new Request("http://localhost:3000/settings/general"),
      },
      createDeps({ token: "token", session: createSession("executive") }),
    );

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind === "redirect_home") {
      expect(decision.to).toBe("/sales/leads");
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
});
