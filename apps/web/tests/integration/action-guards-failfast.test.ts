import { describe, expect, it } from "vitest";

import { getUserLoginRetryReport } from "../../src/actions/admin";
import { listUserSessions, revokeUserSession } from "../../src/actions/admin";
import { requestSalesExport } from "../../src/actions/sales-exports";
import {
  createSalesRecordDraft,
  rejectSalesRecord,
} from "../../src/actions/sales-records";
import { updateProductPricing } from "../../src/actions/settings";
import {
  acceptTeamInvite,
  createTeamInvite,
  resendTeamInvite,
  revokeTeamInvite,
} from "../../src/actions/team";

describe("action guards fail fast", () => {
  it("rejects malformed numeric ids before auth", async () => {
    await expect(rejectSalesRecord(0, "missing docs")).rejects.toThrow(
      "recordId must be a positive integer",
    );
    await expect(updateProductPricing(0, 10, true)).rejects.toThrow(
      "productId must be a positive integer",
    );
    await expect(listUserSessions(0)).rejects.toThrow(
      "userId must be a positive integer",
    );
  });

  it("rejects malformed textual payloads before auth", async () => {
    await expect(requestSalesExport("pdf")).rejects.toThrow(
      "format is invalid",
    );
    await expect(rejectSalesRecord(1, "   ")).rejects.toThrow(
      "reason is required",
    );
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
    await expect(
      createSalesRecordDraft({
        source: "manual",
        leadAssignmentId: null,
        client: {
          ruc: null,
          companyName: "Acme",
          contactName: "Contact",
          dni: "12345678",
          phones: [],
          engineMatchId: null,
          completenessScore: 10,
        },
        addresses: [
          {
            addressType: "installation",
            fullText: "",
            department: null,
            province: null,
            district: null,
            ubigeo: null,
            latitude: null,
            longitude: null,
            isPrimary: true,
          },
        ],
        products: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow("addresses[0].fullText is required");
    await expect(resendTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
    await expect(revokeTeamInvite(0)).rejects.toThrow(
      "inviteId must be a positive integer",
    );
  });
});
