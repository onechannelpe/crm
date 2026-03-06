import { describe, expect, it } from "vitest";

import { canRemoveStrongAuthFactor } from "../../src/lib/auth/security/factor-management-policy";

describe("security factor management policy", () => {
  it("blocks removing the only passkey for protected roles", () => {
    expect(
      canRemoveStrongAuthFactor({
        role: "admin",
        removingTotp: false,
        removingPasskeys: true,
        hasTotp: false,
        hasPasskey: true,
      }),
    ).toBe(false);
  });

  it("blocks disabling totp when it is the last strong factor for protected roles", () => {
    expect(
      canRemoveStrongAuthFactor({
        role: "sales_manager",
        removingTotp: true,
        removingPasskeys: false,
        hasTotp: true,
        hasPasskey: false,
      }),
    ).toBe(false);
  });

  it("allows removing a factor when another strong factor remains", () => {
    expect(
      canRemoveStrongAuthFactor({
        role: "superuser",
        removingTotp: true,
        removingPasskeys: false,
        hasTotp: true,
        hasPasskey: true,
      }),
    ).toBe(true);
  });

  it("allows removing factors for roles without strong-auth requirement", () => {
    expect(
      canRemoveStrongAuthFactor({
        role: "executive",
        removingTotp: true,
        removingPasskeys: true,
        hasTotp: true,
        hasPasskey: true,
      }),
    ).toBe(true);
  });
});
