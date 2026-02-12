import type { Organization } from "./types";
import { OrganizationLockedError } from "../shared/errors";
import type { Result } from "../shared/result";
import { Ok, Err } from "../shared/result";

export function canLockOrganization(
  org: Organization | null,
  branchId: number,
): Result<void, OrganizationLockedError> {
  if (!org) {
    return Ok(undefined);
  }

  if (org.lockedBranchId && org.lockedBranchId !== branchId) {
    return Err(new OrganizationLockedError(org.ruc, org.lockedBranchId));
  }

  return Ok(undefined);
}

export function lockOrganization(
  org: Organization,
  branchId: number,
  userId: number,
): Organization {
  return {
    ...org,
    lockedBranchId: branchId,
    lockedAt: Date.now(),
    lockedByUserId: userId,
  };
}
