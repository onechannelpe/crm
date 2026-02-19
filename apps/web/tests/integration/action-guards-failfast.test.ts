import { describe, expect, it } from "vitest";

import { getUserLoginRetryReport } from "../../src/actions/admin-auth-security";
import {
  listUserSessions,
  revokeUserSession,
} from "../../src/actions/admin-sessions";
import { requestLeads } from "../../src/actions/leads";
import { allocateQuota } from "../../src/actions/quota";
import {
  addSaleDocument,
  createSale,
  rejectSale,
} from "../../src/actions/sales";
import { updateProductPricing } from "../../src/actions/settings";
import {
  acceptTeamInvite,
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "../../src/actions/team";

describe("action guards fail fast", () => {
  it("rejects malformed numeric ids before auth", async () => {
    await expect(createSale(0)).rejects.toThrow(
      "contactId must be a positive integer",
    );
    await expect(allocateQuota(0, 1)).rejects.toThrow(
      "executiveId must be a positive integer",
    );
    await expect(updateProductPricing(0, 10, true)).rejects.toThrow(
      "productId must be a positive integer",
    );
    await expect(listUserSessions(0)).rejects.toThrow(
      "userId must be a positive integer",
    );
  });

  it("rejects malformed textual payloads before auth", async () => {
    await expect(
      addSaleDocument(1, "   ", "text/plain", "AA=="),
    ).rejects.toThrow("filename is required");
    await expect(
      rejectSale(1, [{ field_id: "  ", reviewer_note: null }]),
    ).rejects.toThrow("rejections.field_id is required");
    await expect(revokeUserSession("   ", 1)).rejects.toThrow(
      "sessionId is required",
    );
    await expect(getUserLoginRetryReport("   ")).rejects.toThrow(
      "email is required",
    );
    await expect(
      createTeamInvite({
        fullName: "Test User",
        email: "bad-email",
        role: "executive",
        teamId: null,
      }),
    ).rejects.toThrow("email must be valid");
    await expect(
      createTeamInvite({
        fullName: "Test User",
        email: "test@example.com",
        role: "bad-role",
        teamId: null,
      }),
    ).rejects.toThrow("role is invalid");
    await expect(
      acceptTeamInvite({
        token: "invalid",
        fullName: "Test User",
        password: "Password123",
      }),
    ).rejects.toThrow("token is invalid");
  });

  it("rejects invalid range/count values before auth", async () => {
    await expect(requestLeads(0)).rejects.toThrow(
      "bufferSize must be a positive integer",
    );
    await expect(allocateQuota(1, 0)).rejects.toThrow(
      "amount must be a positive integer",
    );
    await expect(resendTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
    await expect(revokeTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
  });
});
