import { describe, expect, it } from "vitest";

import { getUserLoginRetryReport } from "../../src/actions/admin";
import { listUserSessions, revokeUserSession } from "../../src/actions/admin";
import { requestLeads } from "../../src/actions/leads";
import { allocateQuota } from "../../src/actions/quota";
import { rejectSalesRecord } from "../../src/actions/sales-records";
import { updateProductPricing } from "../../src/actions/settings";
import {
  acceptTeamInvite,
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "../../src/actions/team";

describe("action input guards", () => {
  it("fails fast for invalid sales ids before auth", async () => {
    await expect(rejectSalesRecord(0, "missing docs")).rejects.toThrow(
      "recordId must be a positive integer",
    );
  });

  it("fails fast for invalid quota params before auth", async () => {
    await expect(allocateQuota(1, 0)).rejects.toThrow(
      "amount must be a positive integer",
    );
  });

  it("fails fast for invalid settings params before auth", async () => {
    await expect(updateProductPricing(0, 10, true)).rejects.toThrow(
      "productId must be a positive integer",
    );
  });

  it("fails fast for invalid leads buffer before auth", async () => {
    await expect(requestLeads(0)).rejects.toThrow(
      "bufferSize must be a positive integer",
    );
  });

  it("fails fast for invalid admin session params before auth", async () => {
    await expect(listUserSessions(0)).rejects.toThrow(
      "userId must be a positive integer",
    );
    await expect(revokeUserSession("   ", 1)).rejects.toThrow(
      "sessionId is required",
    );
    await expect(getUserLoginRetryReport("   ")).rejects.toThrow(
      "username is required",
    );
  });

  it("fails fast for invalid team invite params before auth", async () => {
    await expect(
      createTeamInvite({
        names: "Test",
        firstSurname: "User",
        secondSurname: "Test",
        email: "invalid-email",
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
        role: "invalid-role",
        teamId: null,
      }),
    ).rejects.toThrow("role is invalid");
    await expect(resendTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
    await expect(revokeTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
    await expect(
      acceptTeamInvite({
        token: "invalid",
        password: "Password123",
      }),
    ).rejects.toThrow("token is invalid");
  });
});
