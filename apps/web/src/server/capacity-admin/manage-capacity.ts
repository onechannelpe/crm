import type { SessionData } from "~/lib/auth/access/session";
import { grantLeadCapacity } from "~/server/capacity-usage/lead-usage";
import { grantSearchCapacity } from "~/server/capacity-usage/search-usage";
import type {
  LeadCapacityGrantsRepo,
  SearchCapacityGrantsRepo,
} from "~/server/capacity-usage/repos";
import {
  setLeadScopeDefault,
  setLeadUserOverride,
  type SetLeadScopeDefaultCommand,
  type SetLeadUserOverrideCommand,
} from "~/server/capacity-policy/lead-policy";
import {
  setSearchScopeDefault,
  setSearchUserOverride,
  type SetSearchScopeDefaultCommand,
  type SetSearchUserOverrideCommand,
} from "~/server/capacity-policy/search-policy";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import { canManageExecutive, canManageScopeDefault } from "~/server/capacity-policy/scope-access";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { TeamId, UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

interface ManageRepos {
  users: { findById(id: UserId): Promise<{ role: string; branch_id: number; team_id: number | null } | undefined> };
  teams: {
    findBySupervisorId(id: UserId): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(id: TeamId): Promise<{ id: number; branch_id: number; supervisor_id: number | null } | undefined>;
  };
  searchCapacityGrants: SearchCapacityGrantsRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  searchPolicyDefaults: SearchPolicyDefaultsRepo;
  searchPolicyOverrides: SearchPolicyOverridesRepo;
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
}

async function assertManagesExecutive(
  actor: SessionData,
  targetUserId: UserId,
  repos: ManageRepos,
): Promise<Result<void, DomainError>> {
  const managed = await canManageExecutive(actor, targetUserId, repos);
  if (!managed.target) return Err(domainError("not_found", "executive_not_found", "Executive not found"));
  if (!managed.ok) return Err(domainError("forbidden", "cannot_manage_executive", "Cannot manage this executive"));
  return Ok(undefined);
}

export async function grantSearchCapacityDirect(
  command: { actorUserId: UserId; targetUserId: UserId; amount: number; reason: string },
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await assertManagesExecutive(actor, command.targetUserId, repos);
  if (isErr(check)) return check;
  const result = await grantSearchCapacity(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function grantLeadCapacityDirect(
  command: { actorUserId: UserId; targetUserId: UserId; amount: number; reason: string },
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await assertManagesExecutive(actor, command.targetUserId, repos);
  if (isErr(check)) return check;
  const result = await grantLeadCapacity(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateSearchScopeDefault(
  command: SetSearchScopeDefaultCommand,
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageScopeDefault(actor, command.scopeType, command.scopeId, repos);
  if (isErr(check)) return check;
  const result = await setSearchScopeDefault(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateLeadScopeDefault(
  command: SetLeadScopeDefaultCommand,
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageScopeDefault(actor, command.scopeType, command.scopeId, repos);
  if (isErr(check)) return check;
  const result = await setLeadScopeDefault(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateSearchUserOverride(
  command: SetSearchUserOverrideCommand,
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await assertManagesExecutive(actor, command.targetUserId, repos);
  if (isErr(check)) return check;
  const result = await setSearchUserOverride(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateLeadUserOverride(
  command: SetLeadUserOverrideCommand,
  actor: SessionData,
  repos: ManageRepos,
): Promise<Result<{ success: true }, DomainError>> {
  const check = await assertManagesExecutive(actor, command.targetUserId, repos);
  if (isErr(check)) return check;
  const result = await setLeadUserOverride(command, repos);
  if (isErr(result)) return result;
  return Ok({ success: true });
}
