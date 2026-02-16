import { describe, expect, it } from "vitest";

import {
  listUserSessions,
  revokeUserSession,
} from "../../src/actions/admin-sessions";
import { requestLeads } from "../../src/actions/leads";
import { allocateQuota } from "../../src/actions/quota";
import { createSale } from "../../src/actions/sales";
import { updateProductPricing } from "../../src/actions/settings";

describe("action input guards", () => {
  it("fails fast for invalid sales ids before auth", async () => {
    await expect(createSale(0)).rejects.toThrow(
      "contactId must be a positive integer",
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
  });
});
