import { describe, expect, it } from "vitest";

import { getUserLoginRetryReport } from "~/actions/admin/auth-security";
import { listUserSessions } from "~/actions/admin/sessions/read";
import { revokeUserSession } from "~/actions/admin/sessions/revoke";
import { acceptInvitePasswordStep } from "~/actions/auth/invite";
import {
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/actions/team/invites";

// Actions validate the untrusted payload before resolving the actor, so a
// malformed request is rejected without any session or database work. The
// rejection carries a stable domainCode the client localizes on; assert on the
// code rather than the wording.
async function rejectionDomainCode(run: Promise<unknown>): Promise<unknown> {
  try {
    await run;
  } catch (error) {
    if (error && typeof error === "object" && "domainCode" in error) {
      return error.domainCode;
    }
    return undefined;
  }
  throw new Error("expected the action to reject");
}

describe("action guards fail fast", () => {
  it("rejects malformed numeric ids before auth", async () => {
    expect(await rejectionDomainCode(listUserSessions(0))).toBe(
      "invalid_user_id",
    );
  });

  it("rejects malformed textual payloads before auth", async () => {
    expect(await rejectionDomainCode(revokeUserSession("   ", 1))).toBe(
      "session_id_required",
    );
    expect(await rejectionDomainCode(getUserLoginRetryReport("   "))).toBe(
      "username_required",
    );
    expect(
      await rejectionDomainCode(
        createTeamInvite({
          names: "Test",
          firstSurname: "User",
          secondSurname: "Test",
          email: "bad-email",
          role: "executive",
          teamId: null,
        }),
      ),
    ).toBe("invalid_email");
    expect(
      await rejectionDomainCode(
        createTeamInvite({
          names: "Test",
          firstSurname: "User",
          secondSurname: "Test",
          email: "test@example.com",
          role: "bad-role",
          teamId: null,
        }),
      ),
    ).toBe("invalid_role");
    await expect(
      acceptInvitePasswordStep({
        token: "invalid",
        password: "Password123",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "invalid_token",
      message: "El enlace de invitación no es válido.",
    });
  });

  it("rejects invalid range/count values before auth", async () => {
    expect(await rejectionDomainCode(resendTeamInvite(0))).toBe(
      "invalid_invite_id",
    );
    expect(await rejectionDomainCode(revokeTeamInvite(0))).toBe(
      "invalid_invite_id",
    );
  });
});
