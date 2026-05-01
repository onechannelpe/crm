import { describe, expect, it } from "vitest";

import { getUserLoginRetryReport } from "~/actions/admin/auth-security";
import { listUserSessions } from "~/actions/admin/sessions/read";
import { revokeUserSession } from "~/actions/admin/sessions/revoke";
import { acceptTeamInvite } from "~/actions/team/acceptance";
import {
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/actions/team/invites";

describe("action guards fail fast", () => {
  it("rejects malformed numeric ids before auth", async () => {
    await expect(listUserSessions(0)).rejects.toThrow(
      "userId must be a positive integer",
    );
  });

  it("rejects malformed textual payloads before auth", async () => {
    await expect(revokeUserSession("   ", 1)).rejects.toThrow(
      "sessionId is required",
    );
    await expect(getUserLoginRetryReport("   ")).rejects.toThrow(
      "username is required",
    );
    await expect(
      createTeamInvite({
        names: "Test",
        firstSurname: "User",
        secondSurname: "Test",
        email: "bad-email",
        role: "executive",
        teamId: null,
      }),
    ).rejects.toThrow("email must be valid");
    await expect(
      createTeamInvite({
        names: "Test",
        firstSurname: "User",
        secondSurname: "Test",
        email: "test@example.com",
        role: "bad-role",
        teamId: null,
      }),
    ).rejects.toThrow("role is invalid");
    await expect(
      acceptTeamInvite({
        token: "invalid",
        password: "Password123",
      }),
    ).rejects.toThrow("token is invalid");
  });

  it("rejects invalid range/count values before auth", async () => {
    await expect(resendTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
    await expect(revokeTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
  });
});
