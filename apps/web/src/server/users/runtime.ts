import "server-only";
import { join } from "node:path";

import type { UserId } from "~/domain/ids";
import type { Phone } from "~/domain/phone/pe-mobile";
import type { SessionService } from "~/server/auth/session/session.service";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { AppContext } from "~/server/platform/action/context";
import type { UploadsConfig } from "~/server/platform/config/env";
import { createBlobStore } from "~/server/platform/files/blob-store";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
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
import { createAvatarService } from "~/server/users/avatar-service";
import { createBranchesRepo } from "~/server/users/repos-branches";
import { createMemberWorkloadRepo } from "~/server/users/repos-member-workload";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";
import { Err, Ok, type Result } from "~/shared/result";

export function createUsersRuntime(
  serverInfrastructure: ServerInfrastructure,
  sessionService: Pick<SessionService, "revokeAllForUser">,
  uploads: UploadsConfig,
) {
  const usersRepo = createUsersRepo(serverInfrastructure.db);
  const avatarService = createAvatarService(
    { users: usersRepo },
    createBlobStore(join(uploads.storageRoot, "avatars")),
  );
  const userChannelAddressesRepo = createUserChannelAddressRepo(
    serverInfrastructure.db,
  );

  const readDeps = {
    users: usersRepo,
    teams: createTeamsRepo(serverInfrastructure.db),
    branches: createBranchesRepo(serverInfrastructure.db),
  };
  const writeDeps = {
    users: usersRepo,
    sessions: sessionService,
    workload: createMemberWorkloadRepo(serverInfrastructure.db),
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
    claimedAt: Date,
  ): Promise<Result<void, { kind: "address_already_claimed" }>> {
    const claimResult = await userChannelAddressesRepo.claimWhatsAppAddress({
      userId,
      address: phone,
      claimedAt,
    });

    if (claimResult.kind === "already_claimed") {
      return Err({
        kind: "address_already_claimed",
      });
    }

    return Ok(undefined);
  }

  return {
    avatars: avatarService,
    updatePhone,
    members,
  };
}
