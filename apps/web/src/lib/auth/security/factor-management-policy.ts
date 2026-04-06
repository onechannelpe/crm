import type { UsersTable } from "~/lib/db/types";

import { requiresStrongAuthRole } from "./strong-auth-status";

export interface FactorRemovalPolicyInput {
  role: UsersTable["role"];
  removingTotp: boolean;
  removingPasskeys: boolean;
  hasTotp: boolean;
  hasPasskey: boolean;
}

export function canRemoveStrongAuthFactor(
  input: FactorRemovalPolicyInput,
): boolean {
  if (!requiresStrongAuthRole(input.role)) {
    return true;
  }

  return (
    (input.hasTotp && !input.removingTotp) ||
    (input.hasPasskey && !input.removingPasskeys)
  );
}
