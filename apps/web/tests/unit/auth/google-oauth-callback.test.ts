import type { APIEvent } from "@solidjs/start/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Err, Ok } from "~/server/shared/result";

const mocks = vi.hoisted(() => ({
  completeGoogleOAuthCallback: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("~/lib/auth/google/google-callback-login", () => ({
  completeGoogleOAuthCallback: mocks.completeGoogleOAuthCallback,
}));

vi.mock("~/server/runtime", () => ({
  getServerRuntime: () => ({
    auth: {
      login: {
        repos: {},
        privilegedLoginAlertSender: vi.fn<() => Promise<void>>(),
      },
    },
  }),
}));

import { GET } from "~/routes/api/auth/google/callback";

function createApiEvent(request: Request): APIEvent {
  const event = {
    request,
    params: {},
    response: { headers: new Headers() },
    locals: {},
    nativeEvent: {},
  };

  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return event as unknown as APIEvent;
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid callback payload", async () => {
    mocks.completeGoogleOAuthCallback.mockResolvedValue(
      Err({ kind: "bad_request" }),
    );

    const response = await GET(
      createApiEvent(
        new Request("http://localhost/api/auth/google/callback?state=expected"),
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad request");
  });

  it("redirects to login with error and clears oauth cookies", async () => {
    mocks.completeGoogleOAuthCallback.mockResolvedValue(
      Err({ kind: "redirect_to_login", error: "strong_auth_required" }),
    );

    const response = await GET(
      createApiEvent(
        new Request(
          "http://localhost/api/auth/google/callback?code=abc&state=expected",
          {
            headers: {
              cookie:
                "google_oauth_state=expected; google_code_verifier=verifier-123",
              "user-agent": "vitest-agent",
              "x-forwarded-for": "198.51.100.24",
            },
          },
        ),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?error=strong_auth_required",
    );
    expect(response.headers.get("set-cookie")).toContain("google_oauth_state=");
    expect(response.headers.get("set-cookie")).toContain(
      "google_code_verifier=",
    );
    expect(response.headers.get("set-cookie")).not.toContain("session=");
  });

  it("sets session cookie and clears oauth cookies on successful login", async () => {
    mocks.completeGoogleOAuthCallback.mockResolvedValue(
      Ok({
        redirectPath: "/",
        sessionToken: "session-token-1",
      }),
    );

    const response = await GET(
      createApiEvent(
        new Request(
          "http://localhost/api/auth/google/callback?code=abc&state=expected",
          {
            headers: {
              cookie:
                "google_oauth_state=expected; google_code_verifier=verifier-123",
              "user-agent": "vitest-agent",
            },
          },
        ),
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(response.headers.get("set-cookie")).toContain(
      "session=session-token-1",
    );
    expect(response.headers.get("set-cookie")).toContain("google_oauth_state=");
    expect(response.headers.get("set-cookie")).toContain(
      "google_code_verifier=",
    );
  });
});
