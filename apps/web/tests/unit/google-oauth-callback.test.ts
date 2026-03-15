import type { APIEvent } from "@solidjs/start/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAuthorizationCode: vi.fn(),
  parseGoogleClaims: vi.fn(),
  decodeIdToken: vi.fn(),
  submitGoogleLogin: vi.fn(),
  getClientIp: vi.fn(),
  findOAuthAccount: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("arctic", () => ({
  decodeIdToken: mocks.decodeIdToken,
}));

vi.mock("~/lib/auth/google/google-oauth", () => ({
  googleOAuth: {
    validateAuthorizationCode: mocks.validateAuthorizationCode,
  },
  parseGoogleClaims: mocks.parseGoogleClaims,
}));

vi.mock("~/lib/auth/login-flow", () => ({
  submitGoogleLogin: mocks.submitGoogleLogin,
}));

vi.mock("~/lib/auth/password/client-ip", () => ({
  getClientIp: mocks.getClientIp,
}));

vi.mock("~/server/shared/context", () => ({
  privilegedLoginAlertSender: vi.fn(),
  repos: {
    oauthAccounts: {
      findByProvider: mocks.findOAuthAccount,
    },
    users: {
      findById: mocks.findUserById,
    },
  },
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

  return event as unknown as APIEvent;
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.validateAuthorizationCode.mockResolvedValue({
      idToken: () => "google-id-token",
    });
    mocks.decodeIdToken.mockReturnValue({ sub: "google-user-1" });
    mocks.parseGoogleClaims.mockReturnValue({
      sub: "google-user-1",
      email: "admin@test.local",
      name: "Admin User",
    });
    mocks.getClientIp.mockReturnValue("198.51.100.24");
    mocks.findOAuthAccount.mockResolvedValue({
      user_id: 7,
    });
    mocks.findUserById.mockResolvedValue({
      id: 7,
      branch_id: 3,
      role: "admin",
      is_active: 1,
      onboarding_completed_at: 1_710_000_000_000,
      username: "admin.user",
    });
  });

  it("redirects back to login when privileged google login still needs strong auth", async () => {
    mocks.submitGoogleLogin.mockResolvedValue({
      ok: false,
      error: { kind: "strong_auth_required" },
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
