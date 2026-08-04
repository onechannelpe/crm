import type { SessionAuthenticator } from "~/server/auth/session/session.service";
import type { AvatarService } from "~/server/users/avatar-service";
import type { BranchesRepo } from "~/server/users/repos-branches";
import type { MemberWorkloadRepo } from "~/server/users/repos-member-workload";
import type { TeamsRepo } from "~/server/users/repos-teams";
import type { UsersRepo } from "~/server/users/repos-users";

export interface MemberReadDeps {
  users: UsersRepo;
  teams: TeamsRepo;
  branches: BranchesRepo;
}

export interface MemberWriteDeps {
  users: UsersRepo;
  sessions: Pick<SessionAuthenticator, "revokeAllForUser">;
  workload: MemberWorkloadRepo;
}

export interface MemberAvatarDeps {
  users: UsersRepo;
  avatars: AvatarService;
}
