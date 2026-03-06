import type { User } from "~/lib/db/schema";

import { requiresStrongAuthRole } from "./strong-auth-status";

export interface FactorRemovalPolicyInput {
  role: User["role"];
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
