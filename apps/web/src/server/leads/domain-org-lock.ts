import type { Organization } from "~/lib/db/schema";

export function canLockOrganization(
    org: Organization | null,
    branchId: number,
): boolean {
    if (!org) return true;
    if (!org.locked_branch_id) return true;
    return org.locked_branch_id === branchId;
}

export function isLockedToOtherBranch(
    org: Organization,
    branchId: number,
): boolean {
    return !!org.locked_branch_id && org.locked_branch_id !== branchId;
}
