import type { APIEvent } from "@solidjs/start/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeGoogleOAuthCallback: vi.fn(),
  readGoogleOAuthCookies: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("~/lib/auth/google/google-callback-login", () => ({
  completeGoogleOAuthCallback: mocks.completeGoogleOAuthCallback,
}));

vi.mock("~/lib/auth/google/google-oauth-cookies", () => ({
  appendClearedGoogleOAuthCookies: (headers: Headers): void => {
    headers.append("Set-Cookie", "google_oauth_state=; Path=/; Max-Age=0");
    headers.append("Set-Cookie", "google_code_verifier=; Path=/; Max-Age=0");
  },
  readGoogleOAuthCookies: mocks.readGoogleOAuthCookies,
}));

vi.mock("~/lib/auth/password/client-ip", () => ({
  getClientIp: mocks.getClientIp,
}));

vi.mock("~/server/auth/runtime-google-oauth", () => ({
  getGoogleOAuthCallbackRuntime: () => ({
    privilegedLoginAlertSender: vi.fn(),
    repos: {},
  }),
}));

import { GET } from "../../src/routes/api/auth/google/callback";

function createApiEvent(request: Request): APIEvent {
  const event = {
    request,
    params: {},
    response: {
      headers: new Headers(),
    },
    locals: {},
    nativeEvent: {},
  };

  // The callback handler under test only reads `request`; the rest of the API
  // event is a minimal test stub.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return event as unknown as APIEvent;
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.readGoogleOAuthCookies.mockReturnValue({
      state: "expected",
      codeVerifier: "verifier-123",
    });
    mocks.getClientIp.mockReturnValue("198.51.100.24");
  });

  it("redirects back to login when privileged google login still needs strong auth", async () => {
    mocks.completeGoogleOAuthCallback.mockResolvedValue({
      ok: false,
      error: { kind: "redirect_to_login", error: "strong_auth_required" },
    });

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
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?error=strong_auth_required",
    );
    expect(response.headers.get("set-cookie")).not.toContain("session=");
  });
});
