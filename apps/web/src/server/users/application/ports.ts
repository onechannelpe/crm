import type { AccessSecurityTx } from "~/server/auth/application/ports";
import type { AppUow } from "~/server/platform/database/uow";
import type { AvatarService } from "~/server/users/avatar-service";
import type { BranchesRepo } from "~/server/users/repos-branches";
import type { MemberWorkloadRepo } from "~/server/users/repos-member-workload";
import type { TeamsRepo } from "~/server/users/repos-teams";
import type { UsersRepo } from "~/server/users/repos-users";

export type MemberLifecycleTx = AccessSecurityTx & {
  workload: MemberWorkloadRepo;
};

export interface MemberReadDeps {
  users: UsersRepo;
  teams: TeamsRepo;
  branches: BranchesRepo;
}

export interface MemberWriteDeps {
  users: UsersRepo;
  lifecycle: AppUow<MemberLifecycleTx>;
}

export interface MemberAvatarDeps {
  users: UsersRepo;
  avatars: AvatarService;
}
