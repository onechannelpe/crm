import type { Phone } from "~/lib/phone/pe-mobile";
import type { SessionService } from "~/server/auth/session/session.service";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { AppContext } from "~/server/platform/action/context";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  ChangeMemberRoleCommand,
  MemberIdCommand,
  UpdateMemberExpiryCommand,
  UpdateMemberProfileCommand,
} from "~/server/users/application/contracts";
import { getMemberDetail } from "~/server/users/application/queries/get-member-detail";
import { listBranchMembers } from "~/server/users/application/queries/list-branch-members";
import { changeMemberRole } from "~/server/users/application/use-cases/change-member-role";
import { deactivateMember } from "~/server/users/application/use-cases/deactivate-member";
import { deleteMember } from "~/server/users/application/use-cases/delete-member";
import { reactivateMember } from "~/server/users/application/use-cases/reactivate-member";
import { removeMemberAvatar } from "~/server/users/application/use-cases/remove-member-avatar";
import { updateMemberAvatar } from "~/server/users/application/use-cases/update-member-avatar";
import { updateMemberExpiry } from "~/server/users/application/use-cases/update-member-expiry";
import { updateMemberProfile } from "~/server/users/application/use-cases/update-member-profile";
import type { AvatarService } from "~/server/users/avatar-service";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createMemberWorkloadRepo } from "~/server/users/repos-member-workload";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createUsersRuntime(
  infra: ServerInfra,
  sessionService: Pick<SessionService, "revokeAllForUser">,
  avatarService: AvatarService,
) {
  const usersRepo = createUsersRepo(infra.db);
  const userChannelAddressesRepo = createUserChannelAddressRepo(infra.db);

  const readDeps = {
    users: usersRepo,
    teams: createTeamsRepo(infra.db),
    branches: createBranchesRepo(infra.db),
  };
  const writeDeps = {
    users: usersRepo,
    sessions: sessionService,
    workload: createMemberWorkloadRepo(infra.db),
  };
  const avatarDeps = {
    users: usersRepo,
    avatars: avatarService,
  };

  const members = {
    listRoster: (ctx: AppContext) => listBranchMembers(ctx, readDeps),
    getDetail: (ctx: AppContext, input: { userId: UserId }) =>
      getMemberDetail(ctx, readDeps, input),
    updateProfile: (ctx: AppContext, command: UpdateMemberProfileCommand) =>
      updateMemberProfile(ctx, writeDeps, command),
    changeRole: (ctx: AppContext, command: ChangeMemberRoleCommand) =>
      changeMemberRole(ctx, writeDeps, command),
    deactivate: (ctx: AppContext, command: MemberIdCommand) =>
      deactivateMember(ctx, writeDeps, command),
    reactivate: (ctx: AppContext, command: MemberIdCommand) =>
      reactivateMember(ctx, writeDeps, command),
    updateExpiry: (ctx: AppContext, command: UpdateMemberExpiryCommand) =>
      updateMemberExpiry(ctx, writeDeps, command),
    remove: (ctx: AppContext, command: MemberIdCommand) =>
      deleteMember(ctx, writeDeps, command),
    uploadAvatar: (ctx: AppContext, command: { userId: UserId; file: File }) =>
      updateMemberAvatar(ctx, avatarDeps, command),
    removeAvatar: (ctx: AppContext, command: MemberIdCommand) =>
      removeMemberAvatar(ctx, avatarDeps, command),
  };

  async function updatePhone(
    userId: UserId,
    phone: Phone,
  ): Promise<Result<void, { kind: "address_already_claimed" }>> {
    const claimResult = await userChannelAddressesRepo.claimWhatsAppAddress({
      userId,
      address: phone,
      now: new Date(),
    });

    if (claimResult.kind === "already_claimed") {
      return Err({
        kind: "address_already_claimed",
      });
    }

    return Ok(undefined);
  }

  return {
    users: usersRepo,
    updatePhone,
    members,
  };
}
