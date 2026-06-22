import { createRequestContext } from "@tests/support/auth/request-context";
import { makeAuthSession } from "@tests/support/unit/factories";
import { describe, expect, it } from "vitest";

import { enforceAuthRequest } from "~/lib/auth/access/request-auth";

describe("auth middleware routing", () => {
  it("redirects to /login when private route has no session", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/dashboard"),
      locals: { nonce: "nonce", requestContext: createRequestContext(null) },
    });

    expect(decision.kind).toBe("redirect_login");
  });

  it("keeps validated session on request context", async () => {
    const session = makeAuthSession({ role: "executive" });
    const event: { request: Request; locals: App.RequestEventLocals } = {
      request: new Request("http://localhost:3000/records"),
      locals: { nonce: "nonce", requestContext: createRequestContext(session) },
    };

    const decision = await enforceAuthRequest(event);

    expect(decision.kind).toBe("allow");
    await expect(event.locals.requestContext.getAuthSession()).resolves.toEqual(
      session,
    );
  });

  it("redirects to onboarding when session is not onboarded", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/dashboard"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "executive", onboardingCompleted: false }),
        ),
      },
    });

    expect(decision.kind).toBe("redirect_onboarding");
  });

  it("redirects onboarded users away from onboarding", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/onboarding"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "executive" }),
        ),
      },
    });

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind !== "redirect_home") throw new Error("Expected redirect");
    expect(decision.to).toBe("/records");
  });

  it("redirects users from routes they cannot access", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/audit"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "executive" }),
        ),
      },
    });

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind !== "redirect_home") throw new Error("Expected redirect");
    expect(decision.to).toBe("/records");
  });

  it("redirects authenticated users from root to home route", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "logistics" }),
        ),
      },
    });

    expect(decision.kind).toBe("redirect_home");
    if (decision.kind !== "redirect_home") throw new Error("Expected redirect");
    expect(decision.to).toBe("/inventory");
  });

  it("allows users to access permitted routes", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/settings/profile"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "admin" }),
        ),
      },
    });

    expect(decision.kind).toBe("allow");
  });

  it("allows not-onboarded users to reach onboarding", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/onboarding"),
      locals: {
        nonce: "nonce",
        requestContext: createRequestContext(
          makeAuthSession({ role: "executive", onboardingCompleted: false }),
        ),
      },
    });

    expect(decision.kind).toBe("allow");
  });

  it("rejects an unauthenticated API request with 401 instead of a redirect", async () => {
    const decision = await enforceAuthRequest({
      request: new Request("http://localhost:3000/api/me/avatar"),
      locals: { nonce: "nonce", requestContext: createRequestContext(null) },
    });

    expect(decision.kind).toBe("reject");
    if (decision.kind !== "reject") throw new Error("Expected reject");
    expect(decision.response.status).toBe(401);
  });
});
