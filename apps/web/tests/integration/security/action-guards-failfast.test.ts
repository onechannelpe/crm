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
import { ActionError } from "~/lib/wire-error";

// Actions validate the untrusted payload before resolving the actor, so a
// malformed request is rejected without any session or database work. The
// rejection is an ActionError carrying a stable granular `code` the client
// localizes on; assert on the code rather than the wording.
async function rejectionCode(run: Promise<unknown>): Promise<unknown> {
  try {
    await run;
  } catch (error) {
    if (error instanceof ActionError) return error.code;
    return undefined;
  }
  throw new Error("expected the action to reject");
}

describe("action guards fail fast", () => {
  it("rejects malformed numeric ids before auth", async () => {
    expect(await rejectionCode(listUserSessions(0))).toBe("invalid_user_id");
  });

  it("rejects malformed textual payloads before auth", async () => {
    expect(await rejectionCode(revokeUserSession("   ", 1))).toBe(
      "session_id_required",
    );
    expect(await rejectionCode(getUserLoginRetryReport("   "))).toBe(
      "username_required",
    );
    expect(
      await rejectionCode(
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
      await rejectionCode(
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
    expect(await rejectionCode(resendTeamInvite(0))).toBe("invalid_invite_id");
    expect(await rejectionCode(revokeTeamInvite(0))).toBe("invalid_invite_id");
  });
});
