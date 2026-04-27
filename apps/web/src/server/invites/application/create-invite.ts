import { canAssignRole } from "~/lib/auth/access/rbac";
import { generateUsername } from "~/lib/users/generate-username";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
import {
  buildPendingIdentity,
  normalizeInviteEmail,
} from "../domain/pending-identity";
import { issueInvite } from "./issue-invite";
import type {
  CreateInviteInput,
  InviteDeps,
  InviteIssueResult,
  InviteRuntime,
} from "./types";

export async function createInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: CreateInviteInput,
): Promise<Result<InviteIssueResult, DomainError>> {
  if (!canAssignRole(input.actorRole, input.role)) {
    return Err(
      inviteError("role_not_assignable", "You cannot assign the selected role"),
    );
  }

  if (input.role === "executive" && !input.executiveCategory) {
    return Err(
      inviteError(
        "role_not_assignable",
        "Executive category is required for executives",
      ),
    );
  }

  const normalizedEmail = normalizeInviteEmail(input.email);

  return runtime.runInTransaction(async (transactionRepos) => {
      if (input.teamId !== null) {
        const team = await transactionRepos.teams.findByIdWithSupervisor(
          input.teamId,
        );
        if (!team || team.branch_id !== input.branchId) {
          return Err(
            inviteError("invalid_team", "Invalid team for the selected branch"),
          );
        }
      }

      let user = await transactionRepos.users.findByEmail(normalizedEmail);

      if (user?.is_active === 1) {
        return Err(
          inviteError(
            "active_user_exists",
            "A user with this email already exists",
          ),
        );
      }

      if (user && user.branch_id !== input.branchId) {
        return Err(
          inviteError(
            "pending_user_other_branch",
            "A pending user with this email belongs to another branch",
          ),
        );
      }

      if (!user) {
        try {
          const username = await generateUsername(
            input.names,
            input.firstSurname,
            input.secondSurname,
            async (candidate) =>
              (await transactionRepos.users.findByUsername(candidate)) !==
              undefined,
          );

          const createdUserId = await transactionRepos.users.create(
            buildPendingIdentity({
              branchId: input.branchId,
              teamId: input.teamId,
              username,
              email: normalizedEmail,
              role: input.role,
              names: input.names,
              firstSurname: input.firstSurname,
              secondSurname: input.secondSurname,
              executiveCategory: input.executiveCategory ?? null,
            }),
          );
          user = await transactionRepos.users.findById(createdUserId);
        } catch (raceError) {
          const racedUser =
            await transactionRepos.users.findByEmail(normalizedEmail);
          if (!racedUser) {
            throw raceError;
          }
          if (racedUser.is_active === 1) {
            return Err(
              inviteError(
                "active_user_exists",
                "A user with this email already exists",
              ),
            );
          }
          if (racedUser.branch_id !== input.branchId) {
            return Err(
              inviteError(
                "pending_user_other_branch",
                "A pending user with this email belongs to another branch",
              ),
            );
          }
          user = racedUser;
        }
      }

      if (!user) {
        return Err(
          inviteError(
            "invite_target_missing",
            "Could not provision invite target user",
          ),
        );
      }

      await transactionRepos.users.updateInviteProvisioning(user.id, {
        team_id: input.teamId,
        names: input.names,
        first_surname: input.firstSurname,
        second_surname: input.secondSurname,
        role: input.role,
        executive_category: input.executiveCategory ?? null,
        is_active: 0,
      });

      const issued = await issueInvite(transactionRepos, runtime, {
        actorUserId: input.actorUserId,
        branchId: input.branchId,
        userId: user.id,
        email: normalizedEmail,
        role: input.role,
        expiresAt: input.expiresAt ?? null,
      });

      return Ok(issued);
    });
}
